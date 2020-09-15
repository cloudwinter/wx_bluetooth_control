//index.js
//获取应用实例
const util = require('../../utils/util')
const configManager = require('../../utils/configManager')

Page({
  // 初始化数据
  data: {
    // _animationIndex: 0,
    // _animationId: 0,
    // bleOpened: false,
    // animationData: {},
    devices: [],
    connected: {} // 已连接
  },

  // onSwitchChange: function (res) {
  //   this.setData({
  //     bleOpened: res.detail.value
  //   });
  //   if (res.detail.value) {
  //     this.openBluetoothAdapter();
  //   } else {
  //     this.closeBluetoothAdapter();
  //   }
  // },
  onLoad: function () {
    // 1.开启蓝牙
    // this._animation = wx.createAnimation({
    //   duration: 500,
    //   timingFunction: "linear"
    // })
    setTimeout(function () {
      this.openBluetoothAdapter();
    }.bind(this), 500);
  },

  onShow: function () {
    let that = this;
    if (this.data.resultData && this.data.resultData.RESULT_OK) {
      console.error('onShow', "设备详情返回");
      this.data.resultData = {};
      this.closeBluetoothAdapter();
      setTimeout(function () {
        that.openBluetoothAdapter();
      }.bind(this), 100);
    }
  },

  onHide: function () {
    this.stopAnimation();
  },

  // doRotate: function (index) {
  //   this._animation.rotate(90 * index).step();
  //   this.setData({
  //     animationData: this._animation.export()
  //   });
  // },

  startAnimation: function () {
    let that = this;
    if (this.startBluetoothDevicesDiscovery()) {
      wx.showNavigationBarLoading();

      // this.data._animationId = setInterval(function () {
      //   this.doRotate(++this.data._animationIndex);
      // }.bind(this), 500);
      setTimeout(function () {
        that.stopAnimation();
      }.bind(this), 45000);
    }
  },

  stopAnimation: function () {
    // if (this.data._animationId > 0) {
    //   clearInterval(this.data._animationId);
    //   this.data._animationId = 0;
    // }

    wx.hideNavigationBarLoading()
    if (this._discoveryStarted) {
      this.stopBluetoothDevicesDiscovery();
    }
  },

  /**
   * 打开蓝牙适配器
   */
  openBluetoothAdapter() {
    let cur = this;

    // 关闭蓝牙
    cur.stopBluetoothDevicesDiscovery();
    cur.closeBluetoothAdapter();

    wx.openBluetoothAdapter({
      success: (res) => {
        cur.startAnimation();
      },
      fail: (res) => {
        util.showToast(res.errCode === 10001 ? '请开启手机蓝牙功能' : res.errMsg);
        console.error('openBluetoothAdapter', res);
        // this.setData({
        //   bleOpened: false
        // });
        if (res.errCode === 10001) {
          wx.onBluetoothAdapterStateChange(function (res) {
            console.error('onBluetoothAdapterStateChange', res);
            if (res.available) {
              cur.startAnimation();
            }
          })
        }
      },
      complete: (res) => {},
    })
  },

  /**
   * 关闭蓝牙适配器
   */
  closeBluetoothAdapter() {
    if (this.data.connected && this.data.connected.deviceId) {
      console.error('closeBluetoothAdapter',this.data.connected.deviceId);
      this.closeBLEConnection(this.data.connected.deviceId);
    }
    wx.closeBluetoothAdapter({
      complete: (res) => {
        console.error('wx.closeBluetoothAdapter','complete');
      },
      fail: (res) => {
        console.error('wx.closeBluetoothAdapter','fail');
      },
      success: (res) => {
        console.error('wx.closeBluetoothAdapter','success');
      },
    })
    this.setData({
      devices: []
    })
  },

  startBluetoothDevicesDiscovery() {
    console.error("startBluetoothDevicesDiscovery", this._discoveryStarted);
    if (this._discoveryStarted) {
      return false;
    }
    console.error("startBluetoothDevicesDiscovery -->");
    this._discoveryStarted = true
    wx.startBluetoothDevicesDiscovery({
      // services: ['\x03\x03\x12\x18'],
      services: ['0000FFF0'],
      allowDuplicatesKey: false,
      powerLevel:'high',
      success: (res) => {
        this.onBluetoothDeviceFound();
      },
    })
    return true;
  },
  stopBluetoothDevicesDiscovery() {
    if (this._discoveryStarted) {
      wx.stopBluetoothDevicesDiscovery();
      this._discoveryStarted = false;
    }
  },

  onBluetoothDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach(device => {
        if (!device.name && !device.localName) {
          return
        }
        let target = configManager.get(device.deviceId);
        if (target && target[configManager._PROPS._REMARKNAME]) {
          device.remarkName = target[configManager._PROPS._REMARKNAME]
        }
        console.error('onBluetoothDeviceFound:', device, target);
        const foundDevices = this.data.devices
        const idx = util.findIndex(foundDevices, 'deviceId', device.deviceId)
        const data = {}
        if (idx === -1) {
          data[`devices[${foundDevices.length}]`] = device
        } else {
          data[`devices[${idx}]`] = device
        }
        this.setData(data)
      })
    })
  },
  createBLEConnection(e) {
    const device = e.currentTarget.dataset.device;
    if (this.data.connected && this.data.connected.deviceId && this.data.connected.deviceId !== device.deviceId) {
      this.closeBLEConnection(this.data.connected.deviceId);
    }


    if (this.data.connected && this.data.connected.deviceId) {
      wx.navigateTo({
        url: '/pages/detail/detail?d=' + encodeURIComponent(JSON.stringify(device)),
      })
      return;
    }
    wx.showLoading({
      title: '正在连接...',
    })
    wx.createBLEConnection({
      deviceId: device.deviceId,
      success: (res) => {
        wx.hideLoading()
        console.error('createBLEConnection:success', res, device);
        this.setData({
          connected: device
        })
        wx.navigateTo({
          url: '/pages/detail/detail?d=' + encodeURIComponent(JSON.stringify(device)),
        })

        //this.getBLEDeviceServices(deviceId)
      },
      fail: (res) => {
        console.error('createBLEConnection:fail', res);
        wx.hideLoading()
        util.showToast('连接失败，请重新连接');
      }
    })
    this.stopAnimation();
  },
  closeBLEConnection(deviceId) {
    if (!deviceId) {
      return;
    }

    this.setData({
      connected: {}
    })
    wx.closeBLEConnection({
      deviceId: deviceId,
      success: (res) => {
        console.error('closeBLEConnection.success:', res);
      },
      fail: (res) => {
        console.error('closeBLEConnection.fail:', res);
      }
    })
  },

  onUnload: function () {
    // 关闭蓝牙
    this.stopBluetoothDevicesDiscovery();
    this.closeBluetoothAdapter();
  },
  onPullDownRefresh: function () {
    // 下拉刷新
    if (this._discoveryStarted) {
      this.startAnimation();
    } else {
      this.openBluetoothAdapter();
    }
    wx.stopPullDownRefresh({
      complete: (res) => {},
    })
  }
})