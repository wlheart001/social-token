module.exports = {
  components: {
    header: {
      closeTitle: '确定退出吗？',
      exit: '退出',
      cancel: '取消',
      logout: '退出',
      lang: 'English',
      wechat: '关注微信公众号',
    },
    wechat: {
      title: '公众号',
      scan: '微信扫一扫关注公众号',
    },
    qrcode: {
      UniPassAddress: '接收地址',
      CopySuccess: '复制成功',
    },
    tx: {
      title: '交易成功！',
      from: '来自：',
      to: '去往：',
      fee: '手续费：',
      hash: '哈希：',
      block: '区块：',
      remark: '备注：',
      browser: '在区块链浏览器中查看',
    },
  },
  default: {
    AssetFailed: '资产获取失败',
  },
  index: {
    title: '社交代币',
    Welcome: 'Welcome',
    AssetList: '资产列表',
  },
  asset: {
    title: '资产详情',
    Collection: '收款',
    Send: '转账',
    DepositAllToGodwoken: '全部存到 Godwoken',
    DepositToGodwoken: '存到 Godwoken',
    TokenDetails: '代币详情',
    Publisher: '发行人',
    TokenTotal: '代币总量：',
    Circulation: '流通量：',
    IssueDate: '发行日期：',
    SocialStyle: '社交方式：',
    TransactionRecord: '交易记录',
    All: '全部',
    In: '收入',
    Out: '转出',
    loadMore: '加载更多',
    Pending: '交易进行中',
    RejectedTransaction: '您的资产还在钱包中，但交易拥堵导致转账失败了',
    RequestFailed: '请求失败',
  },
  send: {
    title: '转账',
    CollectionAddress: '收款地址',
    CKBAddress: 'CKB 地址',
    Money: '金额',
    Fee: '手续费',
    Send: '发送',
    BadAddress: '错误的地址格式',
    Minimum: '最小金额为 {data} CKB',
    LessThan: '转账金额必须小于余额',
    Maximum: '小数点后最多 {data} 位',
    Integer: '请输入整数',
    PleaseAddress: '请填写收款地址',
    PleaseMoney: '请填写金额',
    RejectSign: '拒绝签名',
    PubkeyMismatch: '公钥不匹配',
    CannotYour: '收款地址不能为自己',
    DoesNot: '对方暂无此资产，需要消耗143CKB为其创建，您的CKB余额不足',
    BeCareful: '注意',
    SendAllTip: '剩余资产金额过低，是否要全部转出？',
    SendAll: '发送全部',
    cancel: '取消',
    SendSuccess: '发送成功',
    SendFailed: '交易失败',
    // tip send cell
    Tip1Title: '提示',
    Tip1: '对方暂无此资产，是否消耗143CKB为其创建？',
    Tip1Confirm: '确认',
    Tip1Cancel: '取消',
    // tip send cell no enough ckb
    Tip2Title: '提示',
    Tip2: '对方暂无此资产，需要消耗143CKB为其创建，您的CKB余额不足',
    Tip2Confirm: '确认',
  },
  deposit: {
    title: '存到 Godwoken',
    CollectionAddress: '收款地址',
    ETHAddress: 'ETH 地址',
    Money: '金额',
    Fee: '手续费',
    Deposit: '存款',
    BadAddress: '错误的地址格式',
    PleaseAddress: '请填写收款地址',
    PleaseMoney: '请填写金额',
    DepositAllToGodwoken: '全部存到 Godwoken',
    DepositToGodwoken: '存到 Godwoken',
    TransactionFailed: '交易失败',
    RejectSign: '拒绝签名',
    PubkeyMismatch: '公钥不匹配',
    TipTitleNote: '提示',
    TipCkbInsufficient: `您的 CKB 余额小于 379.5 CKB`,
    TipSudtInsufficient: `您的 SUDT 余额不足`,
    TipConfirm: '确认',
    TipSudtAmountZero: `您的 SUDT 余额为 0`,
    TipTitleTransactionSuccess: '交易成功',
    TipDeposit: `您的交易已发送成功，请前往 Godwoken 查看结果：`,
    LessThan: '转账金额应不超过余额减手续费后的额度',
    TipInvalidSudt: '您的 SUDT 有误',
    InvalidSignMsg: '您的签名信息有误',
  },
}
