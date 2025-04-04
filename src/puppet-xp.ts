/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import cuid from 'cuid'
import path from 'path'
import fs from 'fs'
import fsPromise from 'fs/promises'
import xml2js from 'xml2js'
import os from 'os'

import * as PUPPET from 'wechaty-puppet'
import { log } from 'wechaty-puppet'
import type {
  FileBoxInterface,
} from 'file-box'
import {
  FileBox,
  FileBoxType,
} from 'file-box'
import {
  attach,
  detach,
} from 'sidecar'

import {
  CHATIE_OFFICIAL_ACCOUNT_QRCODE,
  qrCodeForChatie,
  VERSION,
} from './config.js'

import { WeChatSidecar } from './wechat-sidecar.js'
import { ImageDecrypt } from './pure-functions/image-decrypt.js'
import { XmlDecrypt } from './pure-functions/xml-msgpayload.js'
// import type { Contact } from 'wechaty'

interface ChatroomMemberInfo {
  roomid: string
  admin: string
  roomMember: string[]
}

// 定义一个延时方法
async function wait (ms:number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const userInfo = os.userInfo()
const rootPath = `${userInfo.homedir}\\Documents\\WeChat Files\\`

type PuppetXpOptions = PUPPET.PuppetOptions

// 检查文本是否包含 utf8mb4 字符
function isUtf8mb4(text: string): boolean {
  // 检查是否包含 Unicode 扩展字符(包括 emoji)
  return /[\u{10000}-\u{10FFFF}]/u.test(text)
}

// 处理文件名中的 utf8mb4 字符
function sanitizeFileName(fileName: string): string {
  // 将 utf8mb4 字符替换为下划线
  return fileName.replace(/[\u{10000}-\u{10FFFF}]/gu, '_')
}

// 处理消息文本中的 utf8mb4 字符
function handleUtf8mb4Text(text: string): string {
  if (isUtf8mb4(text)) {
    log.info('PuppetXp', `检测到 utf8mb4 字符: ${text}`)
  }
  return text
}

class PuppetXp extends PUPPET.Puppet {

  static override readonly VERSION = VERSION

  private messageStore: { [k: string]: PUPPET.payloads.Message }

  private roomStore: { [k: string]: PUPPET.payloads.Room }

  private contactStore: { [k: string]: PUPPET.payloads.Contact }

  private scanEventData?: PUPPET.payloads.EventScan

  private selfInfo: any

  private isReady = false

  #sidecar?: WeChatSidecar
  protected get sidecar (): WeChatSidecar {
    return this.#sidecar!
  }

  // 添加缓存
  private roomMemberCache: { [roomId: string]: { [memberId: string]: string } } = {}
  private roomInfoCache: { [roomId: string]: any } = {}

  constructor (
    public override options: PuppetXpOptions = {},
  ) {
    log.info('options...', JSON.stringify(options))
    super(options)
    log.verbose('PuppetXp', 'constructor(%s)', JSON.stringify(options))

    // FIXME: use LRU cache for message store so that we can reduce memory usage
    this.messageStore = {}
    this.roomStore = {}
    this.contactStore = {}
    this.selfInfo = {}
  }

  override version () {
    return VERSION
  }

  async onStart () {
    log.verbose('PuppetXp', 'onStart()')

    if (this.#sidecar) {
      log.warn('PuppetXp', 'onStart() this.#sidecar exists')
      return
    }

    this.#sidecar = new WeChatSidecar({
      version: '3.9.2.23',
      wechatVersion: '3.9.2.23'
    })

    await attach(this.sidecar)
    // await this.onLogin()
    await this.onAgentReady()

    this.sidecar.on('hook', ({ method, args }) => {
      log.verbose('PuppetXp', 'onHook(%s, %s)', method, JSON.stringify(args))

      switch (method) {
        case 'recvMsg':
          this.onHookRecvMsg(args)
          break
        case 'checkQRLogin':
          this.onScan(args)
          break
        case 'loginEvent':
          void this.onLogin()
          break
        case 'agentReady':
          void this.onAgentReady()
          break
        case 'logoutEvent':
          void this.onLogout(args[0] as number)
          break

        default:
          log.warn('PuppetXp', 'onHook(%s,...) lack of handing', method, JSON.stringify(args))
          break
      }
    })

    this.sidecar.on('error', e => {
      try {
        this.emit('error', { data: JSON.stringify(e as any) })
      } catch (e) {
        log.error('emit error fail:', e)
      }
    })

  }

  private async onAgentReady () {
    log.verbose('PuppetXp', 'onAgentReady()')
    this.isReady = true
    this.emit('ready', this.selfInfo)
    // const isLoggedIn = await this.sidecar.isLoggedIn()
    // if (!isLoggedIn) {
    //   await this.sidecar.callLoginQrcode(false)
    // }

  }

  private async onLogin () {
    // log.info('onLogin：', this.isLoggedIn)
    if (!this.isLoggedIn) {
      const selfInfoRaw = JSON.parse(await this.sidecar.getMyselfInfo())
      // log.debug('selfInfoRaw:\n\n\n', selfInfoRaw)
      const selfInfo: PUPPET.payloads.Contact = {
        alias: '',
        avatar: selfInfoRaw.head_img_url,
        friend: false,
        gender: PUPPET.types.ContactGender.Unknown,
        id: selfInfoRaw.id,
        name: selfInfoRaw.name,
        phone: [],
        type: PUPPET.types.Contact.Individual,
      }
      this.selfInfo = selfInfo
      this.contactStore[selfInfo.id] = selfInfo
      // 初始化联系人列表
      await this.loadContactList()
      // 初始化群列表
      await this.loadRoomList()
      // 初始化机器人信息
      await super.login(this.selfInfo.id)
    } else {
      log.info('已处于登录状态，无需再次登录')
    }
  }

  private async onLogout (reasonNum: number) {
    await super.logout(reasonNum ? 'Kicked by server' : 'logout')
  }

  private onScan (args: any) {
    const statusMap = [
      PUPPET.types.ScanStatus.Waiting,
      PUPPET.types.ScanStatus.Scanned,
      PUPPET.types.ScanStatus.Confirmed,
      PUPPET.types.ScanStatus.Timeout,
      PUPPET.types.ScanStatus.Cancel,
    ]

    const status: number = args[0]
    const qrcodeUrl: string = args[1]
    const wxid: string = args[2]
    const avatarUrl: string = args[3]
    const nickname: string = args[4]
    const phoneType: string = args[5]
    const phoneClientVer: number = args[6]
    const pairWaitTip: string = args[7]

    log.info(
      'PuppetXp',
      'onScan() data: %s',
      JSON.stringify(
        {
          avatarUrl,
          nickname,
          pairWaitTip,
          phoneClientVer: phoneClientVer.toString(16),
          phoneType,
          qrcodeUrl,
          status,
          wxid,
        }, null, 2))

    if (pairWaitTip) {
      log.warn('PuppetXp', 'onScan() pairWaitTip: "%s"', pairWaitTip)
    }

    this.scanEventData = {
      qrcode: qrcodeUrl,
      status: statusMap[args[0]] ?? PUPPET.types.ScanStatus.Unknown,
    }
    this.emit('scan', this.scanEventData)
  }

  private async onHookRecvMsg (args: any) {
    let type = PUPPET.types.Message.Unknown
    let roomId = ''
    let toId = ''
    let talkerId = ''
    let text = String(args[2])
    const code = args[0]

    // 处理消息类型
    switch (code) {
      case 1:
        try {
          xml2js.parseString(String(args[4]), { explicitArray: false, ignoreAttrs: true }, function (err: any, json: any) {
            log.verbose('PuppetXp', 'xml2json err:%s', err)
            if (json?.msgsource?.atuserlist === 'atuserlist') {
              type = PUPPET.types.Message.GroupNote
            } else {
              type = PUPPET.types.Message.Text
            }
          })
        } catch (err) {
          log.error('xml2js.parseString fail:', err)
          type = PUPPET.types.Message.Text
        }
        break
      case 3:
        type = PUPPET.types.Message.Image
        break
      case 37:  // 好友请求消息
        type = PUPPET.types.Message.Unknown
        // 解析好友请求信息
        try {
          const friendInfo = {
            type: 'friend_request',
            id: talkerId,
            hello: text,  // 打招呼内容
          }
          text = JSON.stringify(friendInfo)
        } catch (err) {
          log.error('Parse friend request fail:', err)
        }
        break
      case 43:
        type = PUPPET.types.Message.Video
        break
      case 47:
        type = PUPPET.types.Message.Emoticon
        break
      case 49:
        try {
          xml2js.parseString(String(args[4]), { explicitArray: false, ignoreAttrs: true }, function (err: any, json: any) {
            log.verbose('PuppetXp', 'xml2json err:%s', err)
            if (json?.msg?.appmsg?.type === '5') {
              type = PUPPET.types.Message.Url
            } else if (json?.msg?.appmsg?.type === '33') {
              type = PUPPET.types.Message.MiniProgram
            } else if (json?.msg?.appmsg?.type === '6') {
              type = PUPPET.types.Message.Attachment
            } else {
              type = PUPPET.types.Message.Text
            }
          })
        } catch (err) {
          log.error('xml2js.parseString fail:', err)
        }
        break
      case 10000:
        type = PUPPET.types.Message.GroupNote
        break
      default:
        log.info('Unknown message type:', code)
        break
    }

    // 处理发送者和接收者
    if (String(args[1]).split('@').length !== 2) {
      talkerId = String(args[1])
      toId = this.selfInfo.id
    } else {
      talkerId = String(args[3]) || String(args[1].split('@')[0])  // 如果 args[3] 为空，使用群ID的前缀作为备选
      roomId = String(args[1])
    }

    // 根据 isMyMsg 调整发送者和接收者
    if (args[5] === 1) {
      toId = talkerId
      talkerId = this.selfInfo.id
    }

    // 确保 talkerId 不为空
    if (!talkerId) {
      log.warn('PuppetXp', 'Missing talkerId, using fallback:', {
        args,
        text,
        roomId,
      })
      talkerId = this.selfInfo.id
    }

    // 获取或创建用户信息
    let contact = this.contactStore[talkerId]
    if (!contact) {
      // 如果 contactStore 中没有，创建一个新的联系人信息
      contact = {
        alias: '',
        avatar: '',
        friend: true,
        gender: PUPPET.types.ContactGender.Unknown,
        id: talkerId,
        name: talkerId,
        phone: [],
        type: PUPPET.types.Contact.Individual,
      }
      this.contactStore[talkerId] = contact

      // 如果是群聊，尝试获取群成员信息
      if (roomId) {
        try {
          const memberNickname = await this.sidecar.getChatroomMemberNickInfo(talkerId, roomId)
          if (memberNickname) {
            contact.name = memberNickname
          }
        } catch (e) {
          log.warn('PuppetXp', 'Failed to get room member nickname:', e)
        }
      }
    }

    // 构建完整的用户信息
    const userInfo = {
      id: talkerId,
      name: contact.name || talkerId,
      roomId: roomId || '',
      alias: contact.alias || '',
      avatar: contact.avatar || '',
      type: contact.type || PUPPET.types.Contact.Individual,
    }

    // 创建消息载荷
    const payload: PUPPET.payloads.Message = {
      id: cuid(),
      listenerId: toId,
      roomId,
      talkerId,
      text: handleUtf8mb4Text(text),
      timestamp: Date.now(),
      toId,
      type,
    }

    try {
      if (this.isLoggedIn) {
        // 存储消息
        this.messageStore[payload.id] = payload
        
        if (this.isReady) {
          // 准备发送给大模型的数据
          const modelData = {
            message: {
              ...payload,
              type: PUPPET.types.Message[type] || 'Unknown',
            },
            user: {
              ...userInfo,
              id: userInfo.id || talkerId,  // 确保 id 不为空
              name: userInfo.name || talkerId,  // 确保 name 不为空
              roomId: roomId || '',  // 确保 roomId 有值
            },
            messageType: code,
            rawText: text,
            context: {
              isNewChat: !this.roomStore[roomId],
              isFriendRequest: code === 37,
              isRoomJoin: code === 10000,
            }
          }

          // 发送消息事件
          this.emit('message', { 
            messageId: payload.id,
            data: JSON.stringify(modelData),
          })

          // 记录调试信息
          log.info('Message sent to model:', {
            from: userInfo.name,
            text: payload.text,
            userId: userInfo.id,
            roomId: userInfo.roomId,
            type: PUPPET.types.Message[type],
            messageType: code,
          })
        }

        // 处理特殊消息类型
        if (code === 10000) {
          if (text.indexOf('加入了群聊') !== -1) {
            const inviteeList = []
            let inviter = this.selfInfo
            let arrInfo: string[] = []

            // 处理扫码入群和邀请入群两种情况
            if (text.indexOf('通过扫描') !== -1) {
              // 扫码入群格式："xxx"通过扫描"xxx"分享的二维码加入群聊
              arrInfo = text.split(/通过扫描|分享的二维码加入群聊/)
              // 扫码入群时，第一个部分是入群者，第二个部分是分享二维码的人
              if (arrInfo[0]) {
                const name = arrInfo[0]?.split(/"|"/)[1] || ''
                if (arrInfo[0] === '你') {
                  inviteeList.push(this.selfInfo.id)
                } else {
                  let inviteeId = ''
                  for (const i in this.contactStore) {
                    if (this.contactStore[i] && this.contactStore[i]?.name === name) {
                      inviteeId = i
                      if (roomId && this.roomStore[roomId]?.memberIdList.includes(i)) {
                        inviteeList.push(i)
                      }
                    }
                  }

                  // 如果找不到被邀请者信息，使用默认值
                  if (!inviteeId) {
                    const invitee = {
                      alias: '',
                      avatar: '',
                      friend: false,
                      gender: PUPPET.types.ContactGender.Unknown,
                      id: name,
                      name: name,
                      phone: [],
                      type: PUPPET.types.Contact.Individual,
                    }
                    this.contactStore[name] = invitee
                    inviteeList.push(name)
                  }
                }
              }

              // 处理分享二维码的人
              if (arrInfo[1]) {
                const name = arrInfo[1]?.split(/"|"/)[1] || ''
                if (arrInfo[1] === '你') {
                  inviter = this.selfInfo
                } else {
                  let inviterId = ''
                  for (const i in this.contactStore) {
                    if (this.contactStore[i] && this.contactStore[i]?.name === name) {
                      inviterId = i
                      const nickname = await this.getChatroomMemberNickInfo(i, roomId)
                      inviter = {
                        ...this.contactStore[i],
                        name: nickname,
                      }
                      break
                    }
                  }
                  
                  // 如果找不到邀请者信息，使用默认值
                  if (!inviterId) {
                    inviter = {
                      alias: '',
                      avatar: '',
                      friend: false,
                      gender: PUPPET.types.ContactGender.Unknown,
                      id: name,
                      name: name,
                      phone: [],
                      type: PUPPET.types.Contact.Individual,
                    }
                    this.contactStore[name] = inviter
                  }
                }
              }
            } else {
              // 邀请入群格式："xxx"邀请"xxx"加入了群聊
              arrInfo = text.split(/邀请|加入了群聊/)
              // 处理邀请者信息
              if (arrInfo[0]) {
                const name = arrInfo[0]?.split(/"|"/)[1] || ''
                if (arrInfo[0] === '你') {
                  inviter = this.selfInfo
                } else {
                  let inviterId = ''
                  for (const i in this.contactStore) {
                    if (this.contactStore[i] && this.contactStore[i]?.name === name) {
                      inviterId = i
                      const nickname = await this.getChatroomMemberNickInfo(i, roomId)
                      inviter = {
                        ...this.contactStore[i],
                        name: nickname,
                      }
                      break
                    }
                  }
                  
                  // 如果找不到邀请者信息，使用默认值
                  if (!inviterId) {
                    inviter = {
                      alias: '',
                      avatar: '',
                      friend: false,
                      gender: PUPPET.types.ContactGender.Unknown,
                      id: name,
                      name: name,
                      phone: [],
                      type: PUPPET.types.Contact.Individual,
                    }
                    this.contactStore[name] = inviter
                  }
                }
              }

              // 处理被邀请者信息
              if (arrInfo[1]) {
                const name = arrInfo[1]?.split(/"|"/)[1] || ''
                if (arrInfo[1] === '你') {
                  inviteeList.push(this.selfInfo.id)
                } else {
                  let inviteeId = ''
                  for (const i in this.contactStore) {
                    if (this.contactStore[i] && this.contactStore[i]?.name === name) {
                      inviteeId = i
                      if (roomId && this.roomStore[roomId]?.memberIdList.includes(i)) {
                        inviteeList.push(i)
                      }
                    }
                  }

                  // 如果找不到被邀请者信息，使用默认值
                  if (!inviteeId) {
                    const invitee = {
                      alias: '',
                      avatar: '',
                      friend: false,
                      gender: PUPPET.types.ContactGender.Unknown,
                      id: name,
                      name: name,
                      phone: [],
                      type: PUPPET.types.Contact.Individual,
                    }
                    this.contactStore[name] = invitee
                    inviteeList.push(name)
                  }
                }
              }
            }

            // 使用缓存的房间信息
            const roomInfo = this.getRoomInfo(roomId)
            this.roomStore[roomId] = roomInfo

            // 使用 loadRoomListSync 更新群列表
            this.loadRoomListSync()

            // 发出事件
            this.emit('room-join', { inviteeIdList: inviteeList, inviterId: inviter.id, roomId })

            // 异步预加载新成员信息
            void this.preloadRoomMember(roomId)
          }
        }
      }
    } catch (e) {
      log.error('emit message fail:', e, {
        userId: userInfo.id,
        messageId: payload.id,
        type: PUPPET.types.Message[type],
        code,
      })
    }
  }

  // 同步获取群成员昵称
  private async getChatroomMemberNickInfo(memberId: string, roomId: string): Promise<string> {
    try {
      const nickname = await this.sidecar.getChatroomMemberNickInfo(memberId, roomId)
      return nickname || memberId
    } catch (e) {
      log.error('Failed to get chatroom member nick info:', e)
      return memberId
    }
  }

  // 同步获取群信息
  private getRoomInfo(roomId: string): any {
    return this.roomStore[roomId] || {
      adminIdList: [''],
      avatar: '',
      external: false,
      id: roomId,
      memberIdList: [],
      ownerId: '',
      topic: '',
    }
  }

  // 预加载群成员信息
  private async preloadRoomMember(roomId: string) {
    try {
      const memberInfo = await this.sidecar.getChatroomMemberInfo()
      const roomList = JSON.parse(memberInfo)
      
      for (const roomKey in roomList) {
        const roomInfo = roomList[roomKey]
        if (roomInfo.roomid === roomId) {
          // 确保缓存对象存在
          this.roomMemberCache[roomId] = this.roomMemberCache[roomId] || {}
          const roomCache = this.roomMemberCache[roomId]
          
          const memberList = roomInfo.roomMember || []
          for (const memberId of memberList) {
            try {
              // 使用同步方法
              const nickname = await this.getChatroomMemberNickInfo(memberId, roomId)
              if (roomCache) {
                roomCache[memberId] = nickname || memberId
              }
            } catch (err) {
              log.error('Failed to load member nickname:', err)
              // 如果同步调用失败，使用默认值
              if (roomCache) {
                roomCache[memberId] = memberId
              }
            }
          }
          
          this.roomInfoCache[roomId] = roomInfo
          break
        }
      }
    } catch (err) {
      log.error('Failed to preload room member:', err)
    }
  }

  // 同步加载群列表
  private async loadRoomListSync(): Promise<ChatroomMemberInfo[]> {
    try {
      const ChatroomMemberInfo = await this.sidecar.getChatroomMemberInfo()
      return JSON.parse(ChatroomMemberInfo || '[]')
    } catch (e) {
      log.error('Failed to get chatroom member info:', e)
      return []
    }
  }

  async onStop () {
    log.verbose('PuppetXp', 'onStop()')

    this.sidecar.removeAllListeners()

    if (this.logonoff()) {
      await this.logout()
    }

    await detach(this.sidecar)
    this.#sidecar = undefined
  }

  override login (contactId: string): void {
    log.verbose('PuppetXp', 'login()')
    super.login(contactId)
  }

  override ding (data?: string): void {
    log.silly('PuppetXp', 'ding(%s)', data || '')
    setTimeout(() => this.emit('dong', { data: data || '' }), 1000)
  }

  notSupported (name: string): void {
    log.info(`${name} is not supported by PuppetXp yet.`)
  }

  private async loadContactList () {
    const contactList = JSON.parse(await this.sidecar.getContact())

    for (const contactKey in contactList) {
      const contactInfo = contactList[contactKey]
      log.verbose('PuppetXp', 'contactInfo:%s', JSON.stringify(contactInfo))
      let contactType = PUPPET.types.Contact.Individual
      // log.info('contactInfo.id', contactInfo.id)
      if (contactInfo.id.indexOf('gh_') !== -1) {
        contactType = PUPPET.types.Contact.Official
      }
      if (contactInfo.id.indexOf('@openim') !== -1) {
        contactType = PUPPET.types.Contact.Corporation
      }
      const contact = {
        alias: contactInfo.alias,
        avatar: contactInfo.avatarUrl,
        friend: true,
        gender: contactInfo.gender,
        id: contactInfo.id,
        name: contactInfo.name || 'Unknow',
        phone: [],
        type: contactType,
      }
      this.contactStore[contactInfo.id] = contact

    }
  }

  private async loadRoomList () {
    let roomList: any[] = []
    try {
      const ChatroomMemberInfo = await this.sidecar.getChatroomMemberInfo()
      roomList = JSON.parse(ChatroomMemberInfo)
    } catch (err) {
      log.error('loadRoomList fail:', err)
    }

    for (const roomKey in roomList) {
      const roomInfo = roomList[roomKey]

      // log.info(JSON.stringify(Object.keys(roomInfo)))

      const roomId = roomInfo.roomid
      if (roomId.indexOf('@chatroom') !== -1) {
        const roomMember = roomInfo.roomMember || []
        const topic = this.contactStore[roomId]?.name || ''
        const room = {
          adminIdList: [ roomInfo.admin || '' ],
          avatar: '',
          external: false,
          id: roomId,
          memberIdList: roomMember,
          ownerId: roomInfo.admin || '',
          topic,
        }
        this.roomStore[roomId] = room
        delete this.contactStore[roomId]
        for (const memberKey in roomMember) {
          const memberId = roomMember[memberKey]
          if (!this.contactStore[memberId]) {
            try {
              const memberNickName = await this.sidecar.getChatroomMemberNickInfo(memberId, roomId)
              const contact = {
                alias: '',
                avatar: '',
                friend: false,
                gender: PUPPET.types.ContactGender.Unknown,
                id: memberId,
                name: memberNickName || 'Unknown',
                phone: [],
                type: PUPPET.types.Contact.Individual,
              }
              this.contactStore[memberId] = contact
            } catch (err) {
              log.error('loadRoomList fail:', err)
            }
          }
        }
      }

    }

  }

  /**
   *
   * ContactSelf
   *
   *
   */
  override async contactSelfQRCode (): Promise<string> {
    log.verbose('PuppetXp', 'contactSelfQRCode()')
    return CHATIE_OFFICIAL_ACCOUNT_QRCODE
  }

  override async contactSelfName (name: string): Promise<void> {
    log.verbose('PuppetXp', 'contactSelfName(%s)', name)
    if (!name) {
      return this.selfInfo.name
    }
  }

  override async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetXp', 'contactSelfSignature(%s)', signature)
  }

  /**
 *
 * Contact
 *
 */
  override contactAlias(contactId: string): Promise<string>
  override contactAlias(contactId: string, alias: string | null): Promise<void>

  override async contactAlias (contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose('PuppetXp', 'contactAlias(%s, %s)', contactId, alias)
    if (alias) {
      await this.sidecar.modifyContactRemark(contactId, alias)
      return alias
    }
    const contact = await this.contactRawPayload(contactId)
    // if (typeof alias === 'undefined') {
    //   throw new Error('to be implement')
    // }
    return contact.alias
  }

  override async contactPhone(contactId: string): Promise<string[]>
  override async contactPhone(contactId: string, phoneList: string[]): Promise<void>

  override async contactPhone (contactId: string, phoneList?: string[]): Promise<string[] | void> {
    log.verbose('PuppetXp', 'contactPhone(%s, %s)', contactId, phoneList)
    if (typeof phoneList === 'undefined') {
      return []
    }
  }

  override async contactCorporationRemark (contactId: string, corporationRemark: string) {
    log.verbose('PuppetXp', 'contactCorporationRemark(%s, %s)', contactId, corporationRemark)
  }

  override async contactDescription (contactId: string, description: string) {
    log.verbose('PuppetXp', 'contactDescription(%s, %s)', contactId, description)
  }

  override async contactList (): Promise<string[]> {
    log.verbose('PuppetXp', 'contactList()')
    const idList = Object.keys(this.contactStore)
    return idList
  }

  override async contactAvatar(contactId: string): Promise<FileBoxInterface>
  override async contactAvatar(contactId: string, file: FileBoxInterface): Promise<void>

  override async contactAvatar (contactId: string, file?: FileBoxInterface): Promise<void | FileBoxInterface> {
    log.verbose('PuppetXp', 'contactAvatar(%s)', contactId)

    /**
   * 1. set
   */
    if (file) {
      return
    }

    /**
   * 2. get
   */
    const WECHATY_ICON_PNG = 'data:image/png;base64,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'
    return FileBox.fromDataURL(WECHATY_ICON_PNG)
  }

  override async contactRawPayloadParser (payload: PUPPET.payloads.Contact) {
    // log.verbose('PuppetXp', 'contactRawPayloadParser(%s)', JSON.stringify(payload))
    return payload
  }

  override async contactRawPayload (id: string): Promise<PUPPET.payloads.Contact> {
    //  log.verbose('PuppetXp----------------------', 'contactRawPayload(%s,%s)', id, this.contactStore[id]?.name)
    return this.contactStore[id] || {} as any
  }

  /**
 *
 * Conversation
 *
 */
  override async conversationReadMark (conversationId: string, hasRead?: boolean): Promise<void> {
    log.verbose('PuppetService', 'conversationRead(%s, %s)', conversationId, hasRead)
  }

  /**
 *
 * Message
 *
 */
  override async messageContact (
    messageId: string,
  ): Promise<string> {
    log.verbose('PuppetXp', 'messageContact(%s)', messageId)
    const message = this.messageStore[messageId]
    return await XmlDecrypt(message?.text || '', message?.type || PUPPET.types.Message.Unknown)
  }

  override async messageImage (
    messageId: string,
    imageType: PUPPET.types.Image,
  ): Promise<FileBoxInterface> {

    // log.info('PuppetXp', 'messageImage(%s, %s, %s)',
    //   messageId,
    //   imageType,
    //   PUPPET.types.Image[imageType],
    // )
    const message = this.messageStore[messageId]
    let base64 = ''
    let fileName = ''
    let imagePath = ''
    let file:FileBoxInterface

    try {
      if (message?.text) {
        const picData = JSON.parse(message.text)
        const filePath = picData[imageType]
        const dataPath = rootPath + filePath    // 要解密的文件路径
        // log.info('图片原始文件路径：', dataPath, true)

        //  检测图片原始文件是否存在，如果存在则继续，如果不存在则每隔0.5秒后检测一次，直到10s后还不存在则继续
        let fileExist = fs.existsSync(dataPath)
        let count = 0
        while (!fileExist) {
          await wait(500)
          fileExist = fs.existsSync(dataPath)
          if (count > 20) {
            break
          }
          count++
        }
        await fsPromise.access(dataPath)
        // log.info('图片解密文件路径：', dataPath, true)
        const imageInfo = ImageDecrypt(dataPath, messageId)
        // const imageInfo = ImageDecrypt('C:\\Users\\choogoo\\Documents\\WeChat Files\\wxid_pnza7m7kf9tq12\\FileStorage\\Image\\Thumb\\2022-05\\e83b2aea275460cd50352559e040a2f8_t.dat','cl34vez850000gkmw2macd3dw')

        log.info(dataPath, imageInfo.fileName, imageInfo.extension)
        base64 = imageInfo.base64
        fileName = `message-${messageId}-url-${imageType}.${imageInfo.extension}`
        file = FileBox.fromBase64(
          base64,
          fileName,
        )
        const paths = dataPath.split('\\')
        paths[paths.length - 1] = fileName
        imagePath = paths.join('\\')
        log.info('图片解密后文件路径：', imagePath, true)
        await file.toFile(imagePath)
      }
    } catch (err) {
      log.error('messageImage fail:', err)
    }
    return FileBox.fromBase64(
      base64,
      fileName,
    )
  }

  override async messageRecall (
    messageId: string,
  ): Promise<boolean> {
    log.verbose('PuppetXp', 'messageRecall(%s)', messageId)
    this.notSupported('messageRecall')
    return false
  }

  override async messageFile (id: string): Promise<FileBoxInterface> {
    const message = this.messageStore[id]
    //  log.verbose('messageFile', String(message))
    //  log.info('messageFile:', message)
    let dataPath = ''
    let fileName = ''

    if (message?.type === PUPPET.types.Message.Image) {
      return this.messageImage(
        id,
        //  PUPPET.types.Image.Thumbnail,
        PUPPET.types.Image.HD,
      )
    }

    if (message?.type === PUPPET.types.Message.Attachment) {
      try {
        const parser = new xml2js.Parser({
          explicitArray: false,
          ignoreAttrs: true,
          normalize: true,
          normalizeTags: true
        })
        const messageJson = await parser.parseStringPromise(message.text || '')

        const curDate = new Date()
        const year = curDate.getFullYear()
        let month: any = curDate.getMonth() + 1
        if (month < 10) {
          month = '0' + month
        }
        
        // 处理文件名中的 utf8mb4 字符
        fileName = '\\' + sanitizeFileName(messageJson.msg.appmsg[0].title[0])
        const filePath = `${this.selfInfo.id}\\FileStorage\\File\\${year}-${month}`
        dataPath = rootPath + filePath + fileName

        return FileBox.fromFile(
          dataPath,
          fileName,
        )
      } catch (err) {
        log.error('messageFile fail:', err)
      }
    }

    if (message?.type === PUPPET.types.Message.Emoticon && message.text) {
      const text = JSON.parse(message.text)
      try {
        try {
          fileName = text.md5 + '.png'
          return FileBox.fromUrl(text.cdnurl, { name: fileName })
        } catch (err) {
          log.error('messageFile fail:', err)
        }
      } catch (err) {
        log.error('messageFile fail:', err)
      }
    }

    if ([ PUPPET.types.Message.Video, PUPPET.types.Message.Audio ].includes(message?.type || PUPPET.types.Message.Unknown)) {
      this.notSupported('Video/`Audio')
    }
    return FileBox.fromFile(
      dataPath,
      fileName,
    )

  }

  override async messageUrl (messageId: string): Promise<PUPPET.payloads.UrlLink> {
    log.verbose('PuppetXp', 'messageUrl(%s)', messageId)
    const message = this.messageStore[messageId]
    return await XmlDecrypt(message?.text || '', message?.type || PUPPET.types.Message.Unknown)
  }

  override async messageMiniProgram (messageId: string): Promise<PUPPET.payloads.MiniProgram> {
    log.verbose('PuppetXp', 'messageMiniProgram(%s)', messageId)
    const message = this.messageStore[messageId]
    return await XmlDecrypt(message?.text || '', message?.type || PUPPET.types.Message.Unknown)
  }

  override async messageLocation (messageId: string): Promise<PUPPET.payloads.Location> {
    log.verbose('PuppetXp', 'messageLocation(%s)', messageId)
    const message = this.messageStore[messageId]
    return await XmlDecrypt(message?.text || '', message?.type || PUPPET.types.Message.Unknown)
  }

  override async messageRawPayloadParser (payload: PUPPET.payloads.Message) {
    // log.info(payload)
    return payload
  }

  override async messageRawPayload (id: string): Promise<PUPPET.payloads.Message> {
    log.verbose('PuppetXp', 'messageRawPayload(%s)', id)
    if (!this.isLoggedIn) {
      throw new Error('not logged in')
    }
    const payload = this.messageStore[id]
    if (!payload) {
      throw new Error('no payload')
    }
    return payload
  }

  override async messageSendText (
    conversationId: string,
    text: string,
    mentionIdList?: string[],
  ): Promise<void> {
    // 检测并记录 utf8mb4 字符
    if (isUtf8mb4(text)) {
      log.info('PuppetXp', '检测到消息包含 utf8mb4 字符')
    }

    if (conversationId.split('@').length === 2 && mentionIdList && mentionIdList[0]) {
      const wxid = mentionIdList[0]
      const contact = await this.contactRawPayload(wxid)
      await this.sidecar.sendAtMsg(conversationId, text, mentionIdList[0], contact.name)
    } else {
      await this.sidecar.sendMsg(conversationId, text)
    }
  }

  override async messageSendFile (
    conversationId: string,
    file: FileBoxInterface,
  ): Promise<void> {
    // PUPPET.throwUnsupportedError(conversationId, file)
    const filePath = path.resolve(file.name)
    log.verbose('filePath===============', filePath)
    await file.toFile(filePath, true)
    if (file.type === FileBoxType.Url) {
      try {
        await this.sidecar.sendPicMsg(conversationId, filePath)
        // fs.unlinkSync(filePath)
      } catch {
        fs.unlinkSync(filePath)
      }

    } else {
      // filePath = 'C:\\Users\\wechaty\\Documents\\GitHub\\wechat-openai-qa-bot\\data1652169999200.xls'
      try {
        await this.sidecar.sendPicMsg(conversationId, filePath)
        // fs.unlinkSync(filePath)
      } catch (err) {
        PUPPET.throwUnsupportedError(conversationId, file)
        fs.unlinkSync(filePath)
      }
    }
  }

  override async messageSendContact (
    conversationId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetXp', 'messageSendUrl(%s, %s)', conversationId, contactId)

    this.notSupported('SendContact')

    // const contact = this.mocker.MockContact.load(contactId)
    // return this.messageSend(conversationId, contact)
  }

  override async messageSendUrl (
    conversationId: string,
    urlLinkPayload: PUPPET.payloads.UrlLink,
  ): Promise<void> {
    log.verbose('PuppetXp', 'messageSendUrl(%s, %s)', conversationId, JSON.stringify(urlLinkPayload))
    this.notSupported('SendUrl')
    // const url = new UrlLink(urlLinkPayload)
    // return this.messageSend(conversationId, url)
  }

  override async messageSendMiniProgram (
    conversationId: string,
    miniProgramPayload: PUPPET.payloads.MiniProgram,
  ): Promise<void> {
    log.verbose('PuppetXp', 'messageSendMiniProgram(%s, %s)', conversationId, JSON.stringify(miniProgramPayload))

    const xmlstr = `<?xml version="1.0" encoding="UTF-8" ?>
     <msg>
       <fromusername>${this.selfInfo.id}</fromusername>
       <scene>0</scene>
       <appmsg appid="${miniProgramPayload.appid}">
         <title>${miniProgramPayload.title}</title>
         <action>view</action>
         <type>33</type>
         <showtype>0</showtype>
         <url>${miniProgramPayload.pagePath}</url>
         <thumburl>${miniProgramPayload.thumbUrl}</thumburl>
         <sourcedisplayname>${miniProgramPayload.description}</sourcedisplayname>
         <appattach>
           <totallen>0</totallen>
         </appattach>
         <weappinfo>
           <username>${miniProgramPayload.username}</username>
           <appid>${miniProgramPayload.appid}</appid>
           <type>1</type>
           <weappiconurl>${miniProgramPayload.iconUrl}</weappiconurl>
           <appservicetype>0</appservicetype>
           <shareId>2_wx65cc950f42e8fff1_875237370_${new Date().getTime()}_1</shareId>
         </weappinfo>
       </appmsg>
       <appinfo>
         <version>1</version>
         <appname>Window wechat</appname>
       </appinfo>
     </msg>
   `
    // const xmlstr=`<msg><fromusername>${this.selfInfo.id}</fromusername><scene>0</scene><commenturl></commenturl><appmsg appid="wx65cc950f42e8fff1" sdkver=""><title>腾讯出行服务｜加油代驾公交</title><des></des><action>view</action><type>33</type><showtype>0</showtype><content></content><url>https://mp.weixin.qq.com/mp/waerrpage?appid=wx65cc950f42e8fff1&amp;amp;type=upgrade&amp;amp;upgradetype=3#wechat_redirect</url><dataurl></dataurl><lowurl></lowurl><lowdataurl></lowdataurl><recorditem><![CDATA[]]></recorditem><thumburl>http://mmbiz.qpic.cn/mmbiz_png/NM1fK7leWGPaFnMAe95jbg4sZAI3fkEZWHq69CIk6zA00SGARbmsGTbgLnZUXFoRwjROelKicbSp9K34MaZBuuA/640?wx_fmt=png&amp;wxfrom=200</thumburl><messageaction></messageaction><extinfo></extinfo><sourceusername></sourceusername><sourcedisplayname>腾讯出行服务｜加油代驾公交</sourcedisplayname><commenturl></commenturl><appattach><totallen>0</totallen><attachid></attachid><emoticonmd5></emoticonmd5><fileext></fileext><aeskey></aeskey></appattach><weappinfo><pagepath></pagepath><username>gh_ad64296dc8bd@app</username><appid>wx65cc950f42e8fff1</appid><type>1</type><weappiconurl>http://mmbiz.qpic.cn/mmbiz_png/NM1fK7leWGPaFnMAe95jbg4sZAI3fkEZWHq69CIk6zA00SGARbmsGTbgLnZUXFoRwjROelKicbSp9K34MaZBuuA/640?wx_fmt=png&amp;wxfrom=200</weappiconurl><appservicetype>0</appservicetype><shareId>2_wx65cc950f42e8fff1_875237370_1644979747_1</shareId></weappinfo><websearch /></appmsg><appinfo><version>1</version><appname>Window wechat</appname></appinfo></msg>`
    log.info('SendMiniProgram is supported by xp, but only support send the MiniProgram-contact card.')
    await this.sidecar.SendMiniProgram('', conversationId, xmlstr)
  }

  override async messageSendLocation (
    conversationId: string,
    locationPayload: PUPPET.payloads.Location,
  ): Promise<void | string> {
    log.verbose('PuppetXp', 'messageSendLocation(%s, %s)', conversationId, JSON.stringify(locationPayload))
    this.notSupported('SendLocation')
  }

  override async messageForward (
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    log.verbose('PuppetXp', 'messageForward(%s, %s)',
      conversationId,
      messageId,
    )
    const curMessage = this.messageStore[messageId]
    if (curMessage?.type === PUPPET.types.Message.Text) {
      await this.messageSendText(conversationId, curMessage.text || '')
    } else {
      log.info('only Text message forward is supported by xp.')
      PUPPET.throwUnsupportedError(conversationId, messageId)
    }
  }

  /**
 *
 * Room
 *
 */
  override async roomRawPayloadParser (payload: PUPPET.payloads.Room) { return payload }
  override async roomRawPayload (id: string): Promise<PUPPET.payloads.Room|undefined> {
    // log.info('PuppetXp', 'roomRawPayload(%s)', id)
    //  log.verbose('PuppetXp----------------------', 'roomRawPayload(%s%s)', id, this.roomStore[id]?.topic)
    return this.roomStore[id]
  }

  override async roomList (): Promise<string[]> {
    log.verbose('PuppetXp', 'call roomList()')
    const idList = Object.keys(this.roomStore)
    return idList
  }

  override async roomDel (
    roomId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetXp', 'roomDel(%s, %s)', roomId, contactId)
  }

  override async roomAvatar (roomId: string): Promise<FileBoxInterface> {
    log.verbose('PuppetXp', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar)
    }
    log.warn('PuppetXp', 'roomAvatar() avatar not found, use the chatie default.')
    return qrCodeForChatie()
  }

  override async roomAdd (
    roomId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetXp', 'roomAdd(%s, %s)', roomId, contactId)
  }

  override async roomTopic(roomId: string): Promise<string>
  override async roomTopic(roomId: string, topic: string): Promise<void>

  override async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetXp', 'roomTopic(%s, %s)', roomId, topic)
    const payload = await this.roomPayload(roomId)
    if (!topic) {
      return payload.topic
    } else {
      return payload.topic
    }
  }

  override async roomCreate (
    contactIdList: string[],
    topic: string,
  ): Promise<string> {
    log.verbose('PuppetXp', 'roomCreate(%s, %s)', contactIdList, topic)

    return 'mock_room_id'
  }

  override async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetXp', 'roomQuit(%s)', roomId)
  }

  override async roomQRCode (roomId: string): Promise<string> {
    log.verbose('PuppetXp', 'roomQRCode(%s)', roomId)
    return roomId + ' mock qrcode'
  }

  override async roomMemberList (roomId: string): Promise<string[]> {
    log.verbose('PuppetXp', 'roomMemberList(%s)', roomId)
    try {
      const roomRawPayload = await this.roomRawPayload(roomId)
      const memberIdList = roomRawPayload?.memberIdList
      return memberIdList || []
    } catch (e) {
      log.error('roomMemberList()', e)
      return []
    }

  }

  override async roomMemberRawPayload (roomId: string, contactId: string): Promise<PUPPET.payloads.RoomMember> {
    log.verbose('PuppetXp', 'roomMemberRawPayload(%s, %s)', roomId, contactId)
    try {
      const contact = this.contactStore[contactId]
      const MemberRawPayload = {
        avatar: '',
        id: contactId,
        inviterId: contactId,   // "wxid_7708837087612",
        name: contact?.name || 'Unknow',
        roomAlias: contact?.name || '',
      }
      // log.info(MemberRawPayload)
      return MemberRawPayload
    } catch (e) {
      log.error('roomMemberRawPayload()', e)
      const member: PUPPET.payloads.RoomMember = {
        avatar: '',
        id: contactId,
        name: '',
      }
      return member
    }

  }

  override async roomMemberRawPayloadParser (rawPayload: PUPPET.payloads.RoomMember): Promise<PUPPET.payloads.RoomMember> {
    //  log.verbose('PuppetXp---------------------', 'roomMemberRawPayloadParser(%s)', rawPayload)
    return rawPayload
  }

  override async roomAnnounce(roomId: string): Promise<string>
  override async roomAnnounce(roomId: string, text: string): Promise<void>

  override async roomAnnounce (roomId: string, text?: string): Promise<void | string> {
    if (text) {
      return
    }
    return 'mock announcement for ' + roomId
  }

  /**
 *
 * Room Invitation
 *
 */
  override async roomInvitationAccept (roomInvitationId: string): Promise<void> {
    log.verbose('PuppetXp', 'roomInvitationAccept(%s)', roomInvitationId)
  }

  override async roomInvitationRawPayload (roomInvitationId: string): Promise<any> {
    log.verbose('PuppetXp', 'roomInvitationRawPayload(%s)', roomInvitationId)
  }

  override async roomInvitationRawPayloadParser (rawPayload: any): Promise<PUPPET.payloads.RoomInvitation> {
    log.verbose('PuppetXp', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(rawPayload))
    return rawPayload
  }

  /**
 *
 * Friendship
 *
 */
  override async friendshipRawPayload (id: string): Promise<any> {
    return { id } as any
  }

  override async friendshipRawPayloadParser (rawPayload: any): Promise<PUPPET.payloads.Friendship> {
    return rawPayload
  }

  override async friendshipSearchPhone (
    phone: string,
  ): Promise<null | string> {
    log.verbose('PuppetXp', 'friendshipSearchPhone(%s)', phone)
    return null
  }

  override async friendshipSearchWeixin (
    weixin: string,
  ): Promise<null | string> {
    log.verbose('PuppetXp', 'friendshipSearchWeixin(%s)', weixin)
    return null
  }

  override async friendshipAdd (
    contactId: string,
    hello: string,
  ): Promise<void> {
    log.verbose('PuppetXp', 'friendshipAdd(%s, %s)', contactId, hello)
  }

  override async friendshipAccept (
    friendshipId: string,
  ): Promise<void> {
    log.verbose('PuppetXp', 'friendshipAccept(%s)', friendshipId)
  }

  /**
 *
 * Tag
 *
 */
  override async tagContactAdd (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetXp', 'tagContactAdd(%s)', tagId, contactId)
  }

  override async tagContactRemove (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetXp', 'tagContactRemove(%s)', tagId, contactId)
  }

  override async tagContactDelete (
    tagId: string,
  ): Promise<void> {
    log.verbose('PuppetXp', 'tagContactDelete(%s)', tagId)
  }

  override async tagContactList (
    contactId?: string,
  ): Promise<string[]> {
    log.verbose('PuppetXp', 'tagContactList(%s)', contactId)
    return []
  }

}

export { PuppetXp }
export type { PuppetXpOptions }
