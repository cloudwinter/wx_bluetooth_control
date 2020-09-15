const util = require('../../utils/util');
const configManager = require('../../utils/configManager')
const backupManager = require('../../utils/backupManager')

const H = wx.getSystemInfoSync().windowHeight;

const weekArray = [
  '星期日',
  '星期一',
  '星期二',
  '星期三',
  '星期四',
  '星期五',
  '星期六',
];

const weekSimpleArray = [
  '日',
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
];

const HOURS = []
const MINS = []
const SECONDS = []
for (let i = 0; i < 100; i++) {
    if(i<10) {
      HOURS.push('0'+i);
    } else {
      HOURS.push(i);
    }
}
for (let i = 0; i < 60; i++) {
  if(i<10) {
    MINS.push('0'+i);
  } else {
    MINS.push(i);
  }
}
for (let i = 0; i < 60; i++) {
  if(i<10) {
    SECONDS.push('0'+i);
  } else {
    SECONDS.push(i);
  }
}

Page({
  data: {
    H: H,
    setTimeH: H - 100,
    countTimeH: H - 40,
    currentTab: 0,
    debugMock: false,
    RESULT_OK: false,
    device: {},
    deviceId: '',
    serviceId: '',
    characteristicId: '',
    remarkName: '',
    passwordInputVal: '',
    inputValue: '',
    curTime: '',
    curWeek: '',
    curStatus: '',
    showModel: false,
    timeConf: [],
    modalKeyShow: false,
    modalBackupShow: false,
    modalBackupIndex: -1,
    modalBackupData: [],
    modalBackupNameShow: false,
    timeBLEFlag: false,
    currentPwd: '0000',
    showPwdDialog: false,
    newPwd: '',
    daojishi:'00:00:00',
    daojishiflag:'2', //倒计时指示灯 0关 1开,2默认状态
    daojishiStartStopStatus:'', //倒计时开关状态 start/stop
    daojishiTime:[HOURS,MINS,SECONDS],
    daojishiStart:{
      daojishiTime:'关闭',
      daojishiIndex:[0,0,0],
      daojishiOpenClose:'0', // 0关闭,1开启
    },
    daojishiEnd:{
      daojishiTime:'关闭',
      daojishiIndex:[0,0,0],
      daojishiOpenClose:'0', // 0关闭,1开启
    }

  },
  onLoad: function (options) {
    let that = this;
    if (options.d) {
      let device = JSON.parse(decodeURIComponent(options.d));
      if (device && device.deviceId) {
        let target = configManager.get(device.deviceId);
        console.error("onLoad",target);
        this.setData({
          device,
          //timeConf: target && target[configManager._PROPS._CONF] || [],
          remarkName: target && target[configManager._PROPS._REMARKNAME] || '',
          passwordInputVal: target && target[configManager._PROPS._PASSWORD] || '',
          inputValue:target && target[configManager._PROPS._PASSWORD] || '',
          currentTab:target && target[configManager._PROPS._CURRENTTAB] || '',
          daojishiStart:target && target[configManager._PROPS._DAOJISHISTART] && JSON.parse(target[configManager._PROPS._DAOJISHISTART]) || that.data.daojishiStart,
          daojishiEnd:target && target[configManager._PROPS._DAOJISHISTOP] && JSON.parse(target[configManager._PROPS._DAOJISHISTOP]) || that.data.daojishiEnd,
        })
        console.error('detail.onload:', device, target, this.data);
        this.getBLEDeviceServices(device.deviceId);
        return;
      }
    }


    util.showToast('无法获取设备信息，请重新连接');

  },


  getBLEDeviceServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        this.setData({
          modalKeyShow: true
        })
        console.error('getBLEDeviceServices.success:', res);
        let services = res.services;
        if (services && services.length > 0) {
          for (let i = 0; i < services.length; i++) {
            console.log('getBLEDeviceServices:[' + i + "]", services[i])
            if (services[i].isPrimary) {
              // 获取 serviceId 
              this.setData({
                serviceId: services[i].uuid
              })
              this.getBLEDeviceCharacteristics(deviceId, services[i].uuid, i)
              return;
            }
          }
        }
      },
      fail: (res) => {
        console.error('getBLEDeviceServices.fail:', res);
        util.showToast('无法获取设备信息:' + JSON.stringify(res));
      }
    })
  },

  getBLEDeviceCharacteristics(deviceId, serviceId, index) {
    var that = this;
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        console.log('getBLEDeviceCharacteristics.success[' + index + ']:', res.characteristics)

        let characteristics = res.characteristics;
        if (characteristics && characteristics.length > 0) {
          for (let i = 0; i < characteristics.length; i++) {
            let item = characteristics[i]
            if (item.properties.write) {
              that.setData({
                deviceId: deviceId,
                serviceId: serviceId,
                characteristicId: item.uuid
              })
            }
            if (item.properties.notify || item.properties.indicate) {
              wx.notifyBLECharacteristicValueChange({
                deviceId,
                serviceId,
                characteristicId: item.uuid,
                state: true,
                success(res) {
                  console.log('notify 开启成功', res);
                  that.queryPwdCmd();
                }
              })
            }
          }
        }
      },
      fail(res) {
        console.error('getBLEDeviceCharacteristics.fail:', res)
      }
    })
    // // 操作之前先监听，保证第一时间获取数据
    wx.onBLECharacteristicValueChange((res) => {
      const value = util.ab2str(res.value);
      let timeBLEFlag = that.data.timeBLEFlag;
      console.error('onBLECharacteristicValueChange:', res.value, util.ab2str(res.value), timeBLEFlag);
      if (value == '$8#' && !timeBLEFlag) {
        // 发送同步蓝牙定时消息
        that.sendTimeArray(1);
        that.setData({
          timeBLEFlag: true
        })
      }
      if (timeBLEFlag && that.isBleTimeMsg(value)) {
        let pre = value.substr(0, 6);
        if (pre == '$8-7-#') {
          // 结束蓝牙定时
          // 关闭loading
          wx.hideLoading({
            complete: (res) => {},
          })
          that.setData({
            timeBLEFlag: false
          })
        }
        // 开始接受 value转化为timeConfig
        console.error('收到定时信息：', value);
        let itemTimeValue;
        if (value.length > 6) {
          let lastValue = value.substr(6, value.length - 6);
          itemTimeValue = lastValue;
          if (itemTimeValue == '') {
            return;
          }
          that.bleTimeValueTransferToTimeConfig(itemTimeValue);
        }
      }

      if (value == '$6-1-1-#') {
        util.showToast('发送成功');
      } else if (value == '$6-1-0-#') {
        util.showToast('发送失败');
      }
      const cmd = value.substr(0, 2);
      if (cmd == '$7') {
        let time = value.substr(3, 6);
        let week = value.substr(9, 1);
        let statusDesc = '关机'
        let statusValue = value.substr(11, 1);
        if (statusValue === '0') {
          statusDesc = '手动关'
        } else if (statusValue === '1') {
          statusDesc = '手动开'
        } else if (statusValue === '2') {
          statusDesc = '自动开'
        } else if (statusValue === '3') {
          statusDesc = '自动关'
        }
        that.setData({
          curWeek: weekArray[week],
          curTime: time.replace(/(\d{2})(\d{2})(\d{2})/g, "$1:$2:$3"),
          curStatus: statusDesc
        })
      } else if (cmd == '$9') {
        that.setData({
          currentPwd: value.substr(3, 4)
        })
        // 获取密码
        that.startObtainBLETime();
      } else if(cmd == '$E') {
        that.setData({
          daojishi: value.substr(3, 6).replace(/(\d{2})(\d{2})(\d{2})/g, "$1:$2:$3"),
        })
      } else if(cmd == '$F') {
        that.setData({
          daojishiflag: value.substr(3, 1),
        })
      }
    })
  },


  setCurrenTab: function (e) {
    const that = this;
    that.setData({
      currentTab: e.detail.current
    })

    // 切换定时和计时模式发送命令
    let cmd = '$B-' + that.data.currentTab + '-#';
    that.writeBLECharacteristicValue({
      cmd: cmd,
      success: (res) => {
        configManager.putKeyValue(that.data.device.deviceId, configManager._PROPS._CURRENTTAB, that.data.currentTab);
      },
      fail: (res) => {}
    });
  },


  //点击切换，滑块index赋值
  checkCurrent: function (e) {
    const that = this;
    if (that.data.currentTab === e.target.dataset.current) {
      return false;
    } else {
      that.setData({
        currentTab: e.target.dataset.current
      })
    }
  },

  /**
   * 是否是蓝牙板子的定时命令
   */
  isBleTimeMsg: function (value) {
    if (value.length < 6) {
      return false;
    }
    let pre = value.substr(0, 6);
    console.error('isBleTimeMsg', pre);
    if (pre == '$8-0-#' || pre == '$8-1-#' || pre == '$8-2-#' || pre == '$8-3-#' ||
      pre == '$8-4-#' || pre == '$8-5-#' || pre == '$8-6-#' || pre == '$8-7-#') {
      return true;
    }
    return false;
  },

  sendTimeArray: function (i) {
    let that = this;
    if (i == 9) {
      return;
    }
    let cmd = '$8-' + i + '#';
    that.writeBLECharacteristicValue({
      cmd: cmd,
      success: (res) => {
        // 开始接受蓝牙板子定时
        setTimeout(() => {
          that.sendTimeArray(i + 1);
        }, 100);
      },
      fail: (res) => {

      }
    });
  },

  // 蓝牙定时转化为TimeConfig
  bleTimeValueTransferToTimeConfig: function (valueStr) {

    console.error('bleTimeValueTransferToTimeConfig', valueStr);
    let valueLengh = valueStr.length;
    if (valueLengh == 0 || valueLengh < 28) {
      return 0;
    }
    let count = valueLengh / 28;
    let timeConfigArray = this.data.timeConf;
    for (let i = 0; i < count; i++) {
      let startIndex = i * 28;
      if (startIndex >= valueLengh) {
        continue;
      }
      // ps:on21301000000_off21401000000
      let item = valueStr.substr(startIndex, 28);
      if (item == '') {
        continue;
      }
      let timeConfigItem = {};
      timeConfigItem.startTime = this.setStartTime(item);
      timeConfigItem.endTime = this.setEndTime(item);

      console.error('bleTimeValueTransferToTimeConfig.timeConfigItem', timeConfigItem);
      timeConfigArray.push(timeConfigItem);
    }
    this.setData({
      timeConf: timeConfigArray,
    })
  },

  // 设置开始时间
  setStartTime: function (item) {
    let startTime = {};
    let startTimeHour = parseInt(item.substr(2, 2));
    let startTimeMin = parseInt(item.substr(4, 2));
    let week = item.substr(6, 7);
    let weekCN = this.getWeekCN(week);
    startTime.weekCN = weekCN;
    startTime.week = week;
    startTime.hour = startTimeHour;
    startTime.min = startTimeMin;
    return startTime;
  },

  // 设置结束时间
  setEndTime: function (item) {
    let endTime = {};
    let endTimeHour = parseInt(item.substr(17, 2));
    let endTimeMin = parseInt(item.substr(19, 2));
    let week = item.substr(21, 7);
    let weekCN = this.getWeekCN(week);
    endTime.weekCN = weekCN;
    endTime.week = week;
    endTime.hour = endTimeHour;
    endTime.min = endTimeMin;
    return endTime;
  },


  // 获取星期的中文备注
  getWeekCN:function(week) {
    if(week == '' || week.length < 7) {
      return '';
    }
    let weekArr = week.split('');
    let result = '';
    for(let i=0;i<week.length;i++) {
      if(weekArr[i] == 1) {
        result += weekSimpleArray[i]+'、';
      }
    }
    return result;
  },


  writeBLECharacteristicValue(options) {
    let buffer = util.str2ab(options.cmd);
    console.log('writeBLECharacteristicValue 发送命令：', options.cmd, buffer);
    wx.writeBLECharacteristicValue({
      deviceId: this.data.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: buffer,
      success: (res) => {
        console.error('writeBLECharacteristicValue.success:', res);
        options.success && options.success(res);
      },
      fail: (res) => {
        console.error('writeBLECharacteristicValue.fail:', res);
        options.fail && options.fail(res);
      }
    })
  },

  onUnload: function () {
    let that = this;
    util.setResultData('pages/index/index', {
      // RESULT_OK: that.data.RESULT_OK
      RESULT_OK: true
    });
  },

  onInputChange: function (e) {
    this.data.inputValue = e.detail.value;
  },

  onPwdInputChange: function (e) {
    this.data.newPwd = e.detail.value;
  },

  onModalKeyClick: function (e) {
    let cType = e.currentTarget.dataset.ctype;
    let cur = this;
    if (cType === 'cancel') {
      cur.setData({
        modalKeyShow: false
      })
      wx.navigateBack({
        delta: 1,
      })
      return;
    } else if (cType === 'confirm') {
      console.info('点击确认',cur.data.inputValue,cur.data.currentPwd);
      if (cur.data.inputValue != cur.data.currentPwd) {
        util.showToast('请输入正确的4位密码');
        return;
      }
      cur.setData({
        modalKeyShow: false
      })
      configManager.putKeyValue(cur.data.device.deviceId, configManager._PROPS._PASSWORD, cur.data.inputValue);
    } else if (cType === 'modify') {
      cur.setData({
        modalKeyShow: false,
        showPwdDialog: true
      })
    }
  },

  onModalClick: function (e) {
    let cType = e.currentTarget.dataset.ctype;
    let cur = this;
    cur.setData({
      showModal: false
    })
    if (cType === 'confirm') {
      cur.setData({
        remarkName: cur.data.inputValue,
        RESULT_OK: true
      })
      configManager.putKeyValue(cur.data.device.deviceId, configManager._PROPS._REMARKNAME, cur.data.inputValue);
    }
  },

  onPwdModalClick: function (e) {
    let cType = e.currentTarget.dataset.ctype;
    let cur = this;
    let newPwd = cur.data.newPwd;
    if (cType === 'confirm') {
      if (newPwd == '' || cur.data.newPwd.length < 4) {
        util.showToast('请输入4位密码');
        return;
      }
      this.modifyPwdCmd(cur.data.newPwd);
      cur.setData({
        showPwdDialog: false,
      })
    } else {
      cur.setData({
        showPwdDialog: false,
        modalKeyShow:true
      })
    }
  },

  setRemarkName: function (e) {
    this.setData({
      showModal: true,
      inputValue: ''
    })
  },


  setModifyPwd: function () {
    this.setData({
      showPwdDialog: true,
      newPwd: ''
    })
  },


  queryPwdCmd: function () {
    this.writeBLECharacteristicValue({
      cmd: '$9#',
      success: (res) => {

      },
      fail: (res) => {

      }
    });
  },


  modifyPwdCmd: function (pwd) {
    let cur = this;
    let sendCmd = '$A-' + pwd + '-#';
    this.writeBLECharacteristicValue({
      cmd: sendCmd,
      success: (res) => {
        wx.showToast({
          title: '修改密码成功',
        })
        configManager.putKeyValue(cur.data.device.deviceId, configManager._PROPS._PASSWORD, pwd);
      },
      fail: (res) => {
        wx.showToast({
          title: '修改密码失败',
        })
      }
    });
  },



  // 开始发送命令获取蓝牙定时
  startObtainBLETime: function () {
    let that = this;
    // 发送开机信号
    // wx.showLoading({
    //   title: '加载中',
    // })
    // setTimeout(() => {
    //   // 无操作后4S关闭loading
    //   wx.hideLoading();
    // }, 2000);
    that.writeBLECharacteristicValue({
      cmd: '$8#',
      success: (res) => {

      },
      fail: (res) => {
        wx.showToast({
          title: '同步定时失败',
        })
      }
    });
  },



  mock: function (i, itemTimeValue) {
    let that = this;
    that.bleTimeValueTransferToTimeConfig(itemTimeValue);
    if (i > 7) {
      return;
    }
    i++;
    setTimeout(function () {
      that.mock(i, itemTimeValue);
    }, 1000);

  },

  open: function () {
    if (this.data.debugMock) {
      // mock测试
      this.mock(0, 'on21121000000_off22131000000');
    }
    // 发送开机信号
    this.writeBLECharacteristicValue({
      cmd: '＄1#',
      success: (res) => {
        wx.showToast({
          title: '开机成功',
        })
      },
      fail: (res) => {
        wx.showToast({
          title: '开机失败',
        })
      }
    });

  },

  close: function () {
    // 发送关机信号
    this.writeBLECharacteristicValue({
      cmd: '＄2#',
      success: (res) => {
        wx.showToast({
          title: '关机成功',
        })
      },
      fail: (res) => {
        wx.showToast({
          title: '关机失败',
        })
      }
    });
  },

  jiaoshi: function () {
    // TODO
    // 发送校时信号

    var date = new Date();
    //年  
    var Y = date.getFullYear();
    //月  
    var M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1);
    //日  
    var D = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    //时  
    var h = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    //分  
    var m = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    //秒  
    var s = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    // 星期
    var week = this.dateLater();
    var cmdStr = '＄4-' + Y + M + D + h + m + s + week + '-#';
    console.log("当前时间：" + cmdStr);

    this.writeBLECharacteristicValue({
      cmd: cmdStr,
      success: (res) => {
        wx.showToast({
          title: '校时成功',
        })
      },
      fail: (res) => {
        wx.showToast({
          title: '校时失败',
        })
      }
    });

  },
  recover: function () {
    // 发送恢复定时信号
    this.writeBLECharacteristicValue({
      cmd: '＄3#',
      success: (res) => {
        wx.showToast({
          title: '恢复定时成功',
        })
      },
      fail: (res) => {
        wx.showToast({
          title: '恢复定时失败',
        })
      }
    });
  },

  onTimeEdit: function (e) {
    // 编辑定时
    let cur = this;
    try {
      let index = parseInt(e.currentTarget.dataset.index);
      if (cur.data.timeConf.length > index) {
        let conf = cur.data.timeConf[index];
        if (conf && conf.startTime && conf.endTime) {
          wx.navigateTo({
            url: '/pages/time/time?index=' + index + '&startTime=' + encodeURIComponent(JSON.stringify(conf.startTime)) + '&endTime=' + encodeURIComponent(JSON.stringify(conf.endTime)),
          })
        }
      }
    } catch (error) {
      util.showToast('获取定时信息失败');
    }
  },

  onTimeDel: function (e) {
    // 删除定时
    const index = parseInt(e.currentTarget.dataset.index);
    let cur = this;
    wx.showModal({
      content: '确定删除定时' + (index + 1) + '?',
      success: (res) => {
        if (res.confirm) {
          cur.data.timeConf.splice(index, 1);
          cur.setData({
            timeConf: cur.data.timeConf
          })
          let target = configManager.get(cur.data.device.deviceId);
          console.error('删除后：', target);
          util.showToast('删除定时成功');
        }
      },
      fail: (res) => {
        util.showToast('删除定时' + (index + 1) + '失败');
      }
    })
  },

  onTimeAdd: function (e) {
    // 添加定时
    let index = this.data.timeConf.length;
    wx.navigateTo({
      url: '/pages/time/time?index=' + index,
    })
  },

  onCommit: function (e) {


    // 保存发送
    let cur = this;
    if (cur.data.timeConf && cur.data.timeConf.length <= 0) {
      this.writeBLECharacteristicValue({
        cmd: '$6-0-#',
        success: (res) => {
          this.writeBLECharacteristicValue({
            cmd: '$6-1-#',
            success: (res) => {
              util.showToast('发送成功');
            },
            fail: (res) => {
              wx.hideLoading()
            }
          });
        },
        fail: (res) => {
          wx.hideLoading()
        }
      });
      return;
    }
    // configManager.putKeyValue(cur.data.device.deviceId, configManager._PROPS._CONF, cur.data.timeConf);
    // TODO 第一步：判断指令是否有重复
    // TODO 第二步：把指定内容拼起来
    let startCmd = '$6-0-';
    let timeCmd = this.calculateTimeCmd();
    let buffer = util.str2ab(timeCmd);
    let bytesLength = buffer.byteLength;
    console.error('onCommit timeCmd:', timeCmd, bytesLength);
    startCmd = startCmd + '#';
    wx.showLoading({
      title: '发送中...',
    })
    this.writeBLECharacteristicValue({
      cmd: startCmd,
      success: (res) => {
        // TODO 第三步：发送指令
        cur.separateWriteBLE(buffer);
      },
      fail: (res) => {
        wx.hideLoading()
      }
    });
  },

  separateWriteBLE: function (buffer) {
    let that = this;
    let pos = 0;
    let byteLength = buffer.byteLength;
    this.writeBLECharacteristicBuffer(pos, byteLength, buffer);
  },
  // 循环发送命令
  writeBLECharacteristicBuffer: function (pos, byteLength, buffer) {
    var time = util.formatTime(new Date());
    console.error('writeBLECharacteristicBuffer 发送时间:', time);
    let that = this;
    let tmpBuffer;
    if (byteLength <= 0) {
      this.writeBLECharacteristicValue({
        cmd: '$6-1-#',
        success: (res) => {
          util.showToast('发送成功');
        },
        fail: (res) => {
          wx.hideLoading()
        }
      });

      return;
    }
    if (byteLength > 20) {
      tmpBuffer = buffer.slice(pos, pos + 20);
      pos += 20;
      byteLength -= 20;
    } else {
      tmpBuffer = buffer.slice(pos, pos + byteLength);
      pos += byteLength;
      byteLength -= byteLength;
    }
    console.log('writeBLECharacteristicBuffer 发送命令：', pos, byteLength, tmpBuffer);
    wx.writeBLECharacteristicValue({
      deviceId: this.data.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: tmpBuffer,
      success: (res) => {
        console.error('writeBLECharacteristicValue.success:', pos, res);
        setTimeout(() => {
          that.writeBLECharacteristicBuffer(pos, byteLength, buffer);
        }, 100);
      },
      fail: (res) => {
        console.error('writeBLECharacteristicValue.fail:', res);
        util.showToast('发送失败');
      }
    })
  },

  // 获取定时的命令
  calculateTimeCmd: function () {
    let cur = this;
    let cmd = '';
    console.error('onCommit.timeConf:', cur.data.timeConf);
    let timeConf = cur.data.timeConf;
    let timeLength = timeConf.length;
    for (let i = 0; i < timeLength; i++) {
      let item = timeConf[i];
      let startTime = item.startTime;
      let entTime = item.endTime;
      console.error("time-print", startTime, entTime);
      let startTimeHour = startTime.hour < 10 ? '0' + startTime.hour : startTime.hour;
      let startTimeMin = startTime.min < 10 ? '0' + startTime.min : startTime.min;
      let oncmd = 'on' + startTimeHour + startTimeMin;
      let endTimeHour = entTime.hour < 10 ? '0' + entTime.hour : entTime.hour;
      let endTimeMin = entTime.min < 10 ? '0' + entTime.min : entTime.min;
      let offcmd = 'off' + endTimeHour + endTimeMin;
      // let timeWeek = this.calculateTimeWeek(startTime.day, entTime.day);
      let timeStartWeek = startTime.week;
      let timeEndWeek = entTime.week;
      cmd = cmd + oncmd + timeStartWeek + '_' + offcmd + timeEndWeek;
    }
    console.error("time-print", cmd);
    return cmd;
  },



  onBackup: function (e) {
    // 备份导入
    let backupData = backupManager.loadData();
    console.error('onBackup:', backupData);
    this.setData({
      modalBackupData: backupData,
      modalBackupIndex: -1,
      modalBackupShow: true
    })
  },

  onModalBackupClose: function (e) {
    this.setData({
      modalBackupData: [],
      modalBackupIndex: -1,
      modalBackupShow: false
    })
  },

  onModalBankupItemClick: function (e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      modalBackupIndex: index
    })
  },

  onModalBankupDelItemClick: function (e) {

    // 删除定时
    const index = parseInt(e.currentTarget.dataset.index);
    let cur = this;
    wx.showModal({
      content: '确定删除备份' + cur.data.modalBackupData[index].name + '?',
      success: (res) => {
        if (res.confirm) {
          cur.data.modalBackupData.splice(index, 1);
          cur.setData({
            modalBackupData: cur.data.modalBackupData,
            modalBackupNameShow: false,
            modalBackupIndex: -1
          })
          backupManager.remove(index, 1);
          console.error('删除后：', target);
          util.showToast('删除备份成功');
        }
      },
      fail: (res) => {
        util.showToast('删除备份' + (index + 1) + '失败');
      }
    })
  },

  onModalBackupClick: function (e) {
    let cType = e.currentTarget.dataset.ctype;
    let cur = this;

    if (cType === 'backup') {
      // 备份
      if (cur.data.timeConf && cur.data.timeConf.length <= 0) {
        util.showToast('请添加定时设置');
        return;
      }

      cur.setData({
        modalBackupNameShow: true,
        inputValue: '',
        modalBackupShow: false,
        modalBackupIndex: -1
      })
    } else if (cType === 'import') {
      if (cur.data.modalBackupIndex < 0) {
        util.showToast('请选择要导入的备份文件');
        return;
      }
      let backup = cur.data.modalBackupData[cur.data.modalBackupIndex];
      if (backup && backup[backupManager._PROPS._CONF] && backup[backupManager._PROPS._CONF].length > 0) {
        cur.setData({
          modalBackupShow: false,
          modalBackupIndex: -1,
          modalBackupData: [],
          timeConf: backup[backupManager._PROPS._CONF]
        })
        console.error('timeConf:', cur.data.timeConf, cur.data.modalBackupData);
        util.showToast('导入成功');
      } else {
        cur.setData({
          modalBackupShow: false,
          modalBackupIndex: -1,
          modalBackupData: []
        })
        util.showToast('导入失败，请重新导入');
      }
    }
  },

  onModalBackupNameClick: function (e) {
    let cType = e.currentTarget.dataset.ctype;
    let cur = this;
    cur.setData({
      modalBackupNameShow: false
    })
    if (cType === 'confirm') {
      backupManager.put(cur.data.inputValue, cur.data.timeConf);
      util.showToast('备份成功');
    } else {
      util.showToast('取消备份');
    }
  },

  onShow: function () {
    let cur = this;
    const resultData = cur.data.resultData;
    console.error('onShow.resultData:', resultData, cur.data.timeConf);
    if (resultData && resultData.index >= 0) {
      cur.data.resultData = {};
      let len = cur.data.timeConf.length;

      if (resultData.index < len) {
        cur.data.timeConf[resultData.index] = {
          startTime: resultData.startTime,
          endTime: resultData.endTime
        }
      } else {
        cur.data.timeConf.push({
          startTime: resultData.startTime,
          endTime: resultData.endTime
        })
      }

      cur.setData({
        timeConf: cur.data.timeConf
      })

      console.error('onShow.timeConf:', cur.data.timeConf);
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  // onUnload: function () {

  // },


  // 计算当前的年月日星期
  dateLater: function () {
    let dateObj = {};
    let show_day = new Array('0', '1', '2', '3', '4', '5', '6');
    let date = new Date();
    date.setDate(date.getDate());
    let day = date.getDay();
    dateObj.year = date.getFullYear();
    dateObj.month = ((date.getMonth() + 1) < 10 ? ("0" + (date.getMonth() + 1)) : date.getMonth() + 1);
    dateObj.day = (date.getDate() < 10 ? ("0" + date.getDate()) : date.getDate());
    dateObj.week = show_day[day];
    return dateObj.week;
  },

  // 延迟
  delay: function (ms, res) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve(res);
      }, ms);
    });
  },




 



  //计时相关操作

  bindDaojishiChange:function(e) {
    let cType = e.currentTarget.dataset.ctype;
    let index = e.detail.value;
    let that = this;
    let daojishiTimeArray = this.data.daojishiTime;
    let daojishiSetTime = daojishiTimeArray[0][index[0]]+':'+daojishiTimeArray[1][index[1]]+':'+daojishiTimeArray[2][index[2]];
    if(cType == 'start') {
      this.setData({
        daojishiStart:{
          daojishiTime:daojishiSetTime,
          daojishiIndex:index,
          daojishiOpenClose:'1',
        }
      })
      configManager.putKeyValue(that.data.device.deviceId, configManager._PROPS._DAOJISHISTART, JSON.stringify(that.data.daojishiStart));
    } else {
      this.setData({
        daojishiEnd:{
          daojishiTime:daojishiSetTime,
          daojishiIndex:index,
          daojishiOpenClose:'1'
        }
      })
      configManager.putKeyValue(that.data.device.deviceId, configManager._PROPS._DAOJISHISTOP, JSON.stringify(that.data.daojishiEnd));
    }


  },


  openClose:function(e) {
    let cType = e.currentTarget.dataset.ctype;
    let that = this;
    let openClose = '';
    let daojishiSetTime = '00:00:00';
    let daojishiTimeArray = this.data.daojishiTime;
    let index = [0,0,0];
    if(cType == 'start') {
      openClose = that.data.daojishiStart.daojishiOpenClose;
      //index = that.data.daojishiStart.daojishiIndex;
      //daojishiSetTime = daojishiTimeArray[0][index[0]]+':'+daojishiTimeArray[1][index[1]]+':'+daojishiTimeArray[2][index[2]];
      this.setData({
        daojishiStart:{
          daojishiTime:openClose=='0'?daojishiSetTime:'关闭',
          daojishiIndex:index,
          daojishiOpenClose:openClose=='0'?'1':'0'
        }
      })
      configManager.putKeyValue(that.data.device.deviceId, configManager._PROPS._DAOJISHISTART, JSON.stringify(that.data.daojishiStart));
    } else {
      openClose = that.data.daojishiEnd.daojishiOpenClose;
      //index = that.data.daojishiEnd.daojishiIndex;
      //daojishiSetTime = daojishiTimeArray[0][index[0]]+':'+daojishiTimeArray[1][index[1]]+':'+daojishiTimeArray[2][index[2]];
      this.setData({
        daojishiEnd:{
          daojishiTime:openClose=='0'?daojishiSetTime:'关闭',
          daojishiIndex:index,
          daojishiOpenClose:openClose=='0'?'1':'0'
        }
      })
      configManager.putKeyValue(that.data.device.deviceId, configManager._PROPS._DAOJISHISTOP, JSON.stringify(that.data.daojishiEnd));
    }
  },


  // 复位
  reset:function() {
    let that = this;
    let cmdStr = '$D#';
    this.writeBLECharacteristicValue({
      cmd: cmdStr,
      success: (res) => {
        util.showToast('复位成功');
        that.setData({
          daojishi:'00:00:00',
          daojishiflag:'2', //倒计时指示灯 0关 1开,2默认状态
          daojishiStartStopStatus:'',
        })
      },
      fail: (res) => {
        util.showToast('复位失败');
      }
    });
  },


  // 开始暂停
  startTop:function() {
    let that = this;
    let status = this.data.daojishiStartStopStatus;
    let daojishiTimeArray = this.data.daojishiTime;
    let cmdStr = '';
    let msg = '';
    if(status == 'start') {
      msg = '暂停';
      status = 'stop';
      // 如果当前是开始状态，操作为暂停
      cmdStr = '$C-1-#';
      
    } else {
      msg = '开始';
      status = 'start';
      // 非开始状态
      let startIndex = this.data.daojishiStart.daojishiIndex;
      let endIndex = this.data.daojishiEnd.daojishiIndex;
      let daojishiStartTime = daojishiTimeArray[0][startIndex[0]]+''+daojishiTimeArray[1][startIndex[1]]+''+daojishiTimeArray[2][startIndex[2]];
      let daojishiEndTime = daojishiTimeArray[0][endIndex[0]]+''+daojishiTimeArray[1][endIndex[1]]+''+daojishiTimeArray[2][endIndex[2]];
      cmdStr = '$C-0-'+daojishiStartTime+'-'+daojishiEndTime+'-#';
      
    }


    this.writeBLECharacteristicValue({
      cmd: cmdStr,
      success: (res) => {
        util.showToast(msg+'成功');
        that.setData({
          daojishiStartStopStatus:status,
        })
      },
      fail: (res) => {
        util.showToast(msg+'失败');
      }
    });
  },


  catchTouchMove:function() {
    return false;
  }







})