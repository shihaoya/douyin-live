/**
 * 消息类型映射配置 (method -> proto类型)
 * proto package: new_douyin.Webcast.Im
 * 基于 struct.go 的 newMessage 映射
 */
const messageTypeMap = {
  // 基础消息类型
  'WebcastChatMessage': 'new_douyin.Webcast.Im.ChatMessage',
  'WebcastGiftMessage': 'new_douyin.Webcast.Im.GiftMessage',
  'WebcastLikeMessage': 'new_douyin.Webcast.Im.LikeMessage',
  'WebcastMemberMessage': 'new_douyin.Webcast.Im.MemberMessage',
  'WebcastSocialMessage': 'new_douyin.Webcast.Im.SocialMessage',
  'WebcastRoomUserSeqMessage': 'new_douyin.Webcast.Im.RoomUserSeqMessage',
  'WebcastFansclubMessage': 'new_douyin.Webcast.Im.FansclubMessage',
  'WebcastControlMessage': 'new_douyin.Webcast.Im.ControlMessage',
  'WebcastEmojiChatMessage': 'new_douyin.Webcast.Im.EmojiChatMessage',
  'WebcastRoomStatsMessage': 'new_douyin.Webcast.Im.RoomStatsMessage',
  'WebcastRoomMessage': 'new_douyin.Webcast.Im.RoomMessage',
  'WebcastRoomRankMessage': 'new_douyin.Webcast.Im.RoomRankMessage',
  
  // 榜单和横幅
  'WebcastRanklistHourEntranceMessage': 'new_douyin.Webcast.Im.RanklistHourEntranceMessage',
  'WebcastInRoomBannerMessage': 'new_douyin.Webcast.Im.InRoomBannerMessage',
  'WebcastInRoomBannerRefreshMessage': 'new_douyin.Webcast.Im.InRoomBannerRefreshMessage',
  
  // 数据同步和房间信息
  'WebcastRoomDataSyncMessage': 'new_douyin.Webcast.Im.RoomDataSyncMessage',
  'WebcastRoomAuthMessage': 'new_douyin.Webcast.Im.RoomAuthMessage',
  'WebcastRoomIntroMessage': 'new_douyin.Webcast.Im.RoomIntroMessage',
  'WebcastRoomVerifyMessage': 'new_douyin.Webcast.Im.RoomVerifyMessage',
  'WebcastRoomStreamAdaptationMessage': 'new_douyin.Webcast.Im.RoomStreamAdaptationMessage',
  
  // 盲盒和抽奖
  'WebcastLuckyBoxMessage': 'new_douyin.Webcast.Im.LuckyBoxMessage',
  'WebcastLuckyBoxTempStatusMessage': 'new_douyin.Webcast.Im.LuckyBoxTempStatusMessage',
  'WebcastLuckyBoxEndMessage': 'new_douyin.Webcast.Im.LuckyBoxEndMessage',
  'WebcastLuckyBoxRewardMessage': 'new_douyin.Webcast.Im.LuckyBoxRewardMessage',
  'WebcastLotteryEventNewMessage': 'new_douyin.Webcast.Im.LotteryEventNewMessage',
  'WebcastLotteryDrawResultEventMessage': 'new_douyin.Webcast.Im.LotteryDrawResultEventMessage',
  
  // 装饰和特效
  'WebcastDecorationModifyMethod': 'new_douyin.Webcast.Im.DecorationModifyMessage',
  'WebcastDecorationUpdateMessage': 'new_douyin.Webcast.Im.DecorationUpdateMessage',
  'WebcastNotifyEffectMessage': 'new_douyin.Webcast.Im.NotifyEffectMessage',
  'WebcastInteractEffectMessage': 'new_douyin.Webcast.Im.InteractEffectMessage',
  'WebcastTopEffectMessage': 'new_douyin.Webcast.Im.TopEffectMessage',
  'WebcastGiftIconFlashMessage': 'new_douyin.Webcast.Im.GiftIconFlashMessage',
  
  // 连麦相关
  'WebcastLinkMicMethod': 'new_douyin.Webcast.Im.LinkMicMethod',
  'WebcastLinkMicAudienceKtvMessage': 'new_douyin.Webcast.Im.LinkMicAudienceKtvMessage',
  'WebcastLinkMicSendEmojiMessage': 'new_douyin.Webcast.Im.LinkMicSendEmojiMessage',
  'WebcastLinkMicPositionMessage': 'new_douyin.Webcast.Im.LinkMicPositionMessage',
  'WebcastLinkMicGuideMessage': 'new_douyin.Webcast.Im.LinkMicGuideMessage',
  'WebcastLinkSettingNotifyMessage': 'new_douyin.Webcast.Im.LinkSettingNotifyMessage',
  'WebcastLinkMessage': 'new_douyin.Webcast.Im.LinkMessage',
  
  // 连麦对战
  'WebcastLinkMicBattleMethod': 'new_douyin.Webcast.Im.LinkMicBattle',
  'WebcastLinkMicBattleFinishMethod': 'new_douyin.Webcast.Im.LinkMicBattleFinish',
  'WebcastBattleTeamTaskMessage': 'new_douyin.Webcast.Im.BattleTeamTaskMessage',
  'WebcastBattleEndPunishMessage': 'new_douyin.Webcast.Im.BattleEndPunishMessage',
  'WebcastBattleEffectContainerMessage': 'new_douyin.Webcast.Im.BattleEffectContainerMessage',
  'WebcastBattleMultiMatchMessage': 'new_douyin.Webcast.Im.BattleMultiMatchMessage',
  'WebcastLinkmicTeamfightMessage': 'new_douyin.Webcast.Im.LinkmicTeamfightMessage',
  
  // KTV相关
  'WebcastKtvMessage': 'new_douyin.Webcast.Im.KtvMessage',
  'WebcastKTVPlayModeStartMessage': 'new_douyin.Webcast.Im.KTVPlayModeStartMessage',
  'WebcastKTVUserSingingHotMessage': 'new_douyin.Webcast.Im.KTVUserSingingHotMessage',
  'WebcastKTVSingerHotRankPosMessage': 'new_douyin.Webcast.Im.KTVSingerHotRankPosMessage',
  
  // 问答和投票
  'WebcastQuizAudienceStatusMessage': 'new_douyin.Webcast.Im.QuizAudienceStatusMessage',
  'WebcastGiftVoteMessage': 'new_douyin.Webcast.Im.GiftVoteMessage',
  
  // 热门和通知
  'WebcastHotChatMessage': 'new_douyin.Webcast.Im.HotChatMessage',
  'WebcastHotRoomMessage': 'new_douyin.Webcast.Im.HotRoomMessage',
  'WebcastAudioChatMessage': 'new_douyin.Webcast.Im.AudioChatMessage',
  'WebcastRoomNotifyMessage': 'new_douyin.Webcast.Im.NotifyMessage',
  'WebcastNoticeMessage': 'new_douyin.Webcast.Im.NoticeMessage',
  'WebcastToastMessage': 'new_douyin.Webcast.Im.ToastMessage',
  'WebcastCommonToastMessage': 'new_douyin.Webcast.Im.CommonToastMessage',
  'WebcastPrizeNoticeMessage': 'new_douyin.Webcast.Im.PrizeNoticeMessage',
  'WebcastBrokerNotifyMessage': 'new_douyin.Webcast.Im.BrokerNotifyMessage',
  
  // 粉丝票和成长任务
  'WebcastUpdateFanTicketMessage': 'new_douyin.Webcast.Im.UpdateFanTicketMessage',
  'WebcastGrowthTaskMessage': 'new_douyin.Webcast.Im.GrowthTaskMessage',
  
  // 弹幕特效
  'WebcastScreenChatMessage': 'new_douyin.Webcast.Im.ScreenChatMessage',
  'WebcastPrivilegeScreenChatMessage': 'new_douyin.Webcast.Im.PrivilegeScreenChatMessage',
  'WebcastExhibitionChatMessage': 'new_douyin.Webcast.Im.ExhibitionChatMessage',
  'WebcastHighlightComment': 'new_douyin.Webcast.Im.HighlightComment',
  
  // 礼物相关
  'WebcastLightGiftMessage': 'new_douyin.Webcast.Im.LightGiftMessage',
  'WebcastGiftSortMessage': 'new_douyin.Webcast.Im.GiftSortMessage',
  'WebcastBindingGiftMessage': 'new_douyin.Webcast.Im.NotifyEffectMessage_BindingGiftMessage',
  'WebcastChatLikeMessage': 'new_douyin.Webcast.Im.ChatLikeMessage',
  
  // 电商和购物
  'WebcastLiveEcomGeneralMessage': 'new_douyin.Webcast.Im.LiveEcomGeneralMessage',
  'WebcastLiveEcomMessage': 'new_douyin.Webcast.Im.LiveEcomMessage',
  'WebcastLiveShoppingMessage': 'new_douyin.Webcast.Im.LiveShoppingMessage',
  'WebcastProductChangeMessage': 'new_douyin.Webcast.Im.ProductChangeMessage',
  'WebcastShelfTradeDataMessage': 'new_douyin.Webcast.Im.ShelfTradeDataMessage',
  'WebcastCommerceMessage': 'new_douyin.Webcast.Im.CommerceMessage',
  
  // 游戏相关
  'WebcastGameCPBaseMessage': 'new_douyin.Webcast.Im.GameCPBaseMessage',
  'WebcastGameStatusMessage': 'new_douyin.Webcast.Im.GameStatusMessage',
  'WebcastGameAncAudEntranceMessage': 'new_douyin.Webcast.Im.GameAncAudEntranceMessage',
  'WebcastGameCPAnchorPromoteInfoMessage': 'new_douyin.Webcast.Im.GameCPAnchorPromoteInfoMessage',
  'WebcastGameCPUserDownloadMessage': 'new_douyin.Webcast.Im.GameCPUserDownloadMessage',
  
  // 其他特效和状态
  'WebcastSandwichBorderMessage': 'new_douyin.Webcast.Im.SandwichBorderMessage',
  'WebcastTempStateAreaReachMessage': 'new_douyin.Webcast.Im.TempStateAreaReachMessage',
  'WebcastCornerReachMessage': 'new_douyin.Webcast.Im.CornerReachMessage',
  'WebcastVisibilityRangeChangeMessage': 'new_douyin.Webcast.Im.VisibilityRangeChangeMessage',
  'WebcastFeedbackCardMessage': 'new_douyin.Webcast.Im.FeedbackCardMessage',
  'WebcastStampMessage': 'new_douyin.Webcast.Im.StampMessage',
  'WebcastCustomizedCardMessage': 'new_douyin.Webcast.Im.CustomizedCardMessage',
  'WebcastAudienceEntranceMessage': 'new_douyin.Webcast.Im.AudienceEntranceMessage',
  'WebcastGroupLiveContainerChangeMessage': 'new_douyin.Webcast.Im.GroupLiveContainerChangeMessage',
  'WebcastBackupSEIMessage': 'new_douyin.Webcast.Im.BackupSEIMessage',
  'WebcastDataLifeLiveMessage': 'new_douyin.Webcast.Im.DataLifeLiveMessage',
  
  // 资产和特权
  'WebcastAssetMessage': 'new_douyin.Webcast.Im.AssetMessage',
  'WebcastAssetEffectUtilMessage': 'new_douyin.Webcast.Im.AssetEffectUtilMessage',
  'WebcastUserPrivilegeChangeMessage': 'new_douyin.Webcast.Im.UserPrivilegeChangeMessage',
  
  // 连麦军团
  'WebcastLinkMicArmiesMethod': 'new_douyin.Webcast.Im.LinkMicArmies',
  'WebcastBattleSeasonPKResultMessage': 'new_douyin.Webcast.Im.BattleSeasonPKResultMessage',
  'WebcastBattlePowerContainerMessage': 'new_douyin.Webcast.Im.BattlePowerContainerMessage',
  
  // 其他
  'WebcastSyncStreamMessage': 'new_douyin.Webcast.Im.SyncStreamMessage',
  'WebcastPullStreamUpdateMessage': 'new_douyin.Webcast.Im.PullStreamUpdateMessage',
  'WebcastImDeleteMessage': 'new_douyin.Webcast.Im.ImDeleteMessage',
  'WebcastPortalMessage': 'new_douyin.Webcast.Im.PortalMessage',
  'WebcastAudioBGImgMessage': 'new_douyin.Webcast.Im.AudioBGImgMessage',
  'WebcastResidentGuestMessage': 'new_douyin.Webcast.Im.ResidentGuestMessage',
  'WebcastLinkmicEcologyMessage': 'new_douyin.Webcast.Im.LinkmicEcologyMessage',
  'WebcastLowPcuGuideMessage': 'new_douyin.Webcast.Im.LowPcuGuideMessage',
  'WebcastProfitInteractionScoreMessage': 'new_douyin.Webcast.Im.ProfitInteractionScoreMessage',
  'WebcastProfitGameStatusMessage': 'new_douyin.Webcast.Im.ProfitGameStatusMessage',
  'WebcastDoubleLikeTopUserMessage': 'new_douyin.Webcast.Im.DoubleLikeTopUserMessage',
  'WebcastSunDailyRankMessage': 'new_douyin.Webcast.Im.SunDailyRankMessage',
  'WebcastSunDailyRegionRankMessage': 'new_douyin.Webcast.Im.SunDailyRankMessage',
  'WebcastRankListAwardMessage': 'new_douyin.Webcast.Im.RankListAwardMessage',
  'WebcastActivityEmojiGroupsMessage': 'new_douyin.Webcast.Im.ActivityEmojiGroupsMessage',
  'WebcastInteractOpenAppStatusMessage': 'new_douyin.Webcast.Im.InteractOpenAppStatusMessage'
};

module.exports = {
  messageTypeMap,
  getProtoType: (method) => messageTypeMap[method] || null,
  isSupported: (method) => messageTypeMap.hasOwnProperty(method),
  getSupportedMethods: () => Object.keys(messageTypeMap),
  addMessageType: (method, protoType) => { messageTypeMap[method] = protoType; }
};
