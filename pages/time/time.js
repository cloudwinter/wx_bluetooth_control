// pages/time/time.js
const util = require('../../utils/util')
const date = new Date()
const weekArray = [
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
for (let i = 0; i < 24; i++) {
  HOURS.push(i);
}
for (let i = 0; i < 60; i++) {
  MINS.push(i);
}
Page({

  /**
   * 页面的初始数据
   */
  data: {
    hours: HOURS,
    mins: MINS,
    index: 0,
    startSelectWeek: '',
    startTime: {
      hour: date.getHours(),
      min: 0,
      week: '0000000',
      weekCN:''
    },
    endSelectWeek: '',
    endTime: {
      hour: date.getHours(),
      min: 30,
      week: '0000000',
      weekCN:''
    },
    modalTime: {
      show: false,
      type: 'startTime',
      value: [0, 0]
    },
    modalDay: {
      show: false,
      type: 'startTime',
      value: [0]
    },
    list: [{
        id: 1,
        name: '周一',
        checked: false
      },
      {
        id: 2,
        name: '周二',
        checked: false
      },
      {
        id: 3,
        name: '周三',
        checked: false
      },
      {
        id: 4,
        name: '周四',
        checked: false
      },
      {
        id: 5,
        name: '周五',
        checked: false
      },
      {
        id: 6,
        name: '周六',
        checked: false
      },
      {
        id: 0,
        name: '周日',
        checked: false
      },
    ],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.error('onLoad:', options);
    if (options.index) {
      let index = parseInt(options.index);
      this.data.index = index;
      wx.setNavigationBarTitle({
        title: '定时' + (index + 1),
      })
    }

    if (options.startTime && options.endTime) {
      let startTime = JSON.parse(decodeURIComponent(options.startTime));
      let endTime = JSON.parse(decodeURIComponent(options.endTime));
      if (startTime && endTime) {
        let startWeek = startTime.week;
        let startSelectWeek = '';
        // 设置开始星期描述
        let startWeekArray = startWeek.split('');
        for (let i = 1; i < startWeekArray.length; i++) {
          if (startWeekArray[i] == '1') {
            startSelectWeek += ' ' + this.data.list[i-1].name
          }
        }
        if (startWeekArray[0] == '1') {
          startSelectWeek += ' 周日'
        }

        // 设置关闭星期描述
        let endWeek = endTime.week;
        let endSelectWeek = '';
        let endWeekArray = endWeek.split('');
        for (let i = 1; i < endWeekArray.length; i++) {
          if (endWeekArray[i] == '1') {
            endSelectWeek += ' ' + this.data.list[i-1].name
          }
        }
        if (endWeekArray[0] == '1') {
          endSelectWeek += ' 周日'
        }


        this.setData({
          startTime,
          endTime,
          startSelectWeek: startSelectWeek,
          endSelectWeek: endSelectWeek
        })
      }
    }

  },

  onTimeClick: function (e) {
    let cType = e.currentTarget.dataset.ctype;
    let cur = this;
    cur.setData({
      modalTime: {
        show: true,
        type: cType,
        value: [cur.data[cType].hour, cur.data[cType].min]
      }
    })
  },


  bindStartTimeChange: function (e) {
    const val = e.detail.value;
    console.error("bindStartTimeChange", val);
    let valArray = val.split(":");
    let cur = this;
    cur.setData({
      startTime: {
        hour: parseInt(valArray[0]),
        min: parseInt(valArray[1]),
        week: cur.data.startTime.week,
        weekCN:cur.getWeekCN(cur.data.startTime.week),
      },
    })
  },

  bindEndTimeChange: function (e) {
    const val = e.detail.value;
    console.error("bindEndTimeChange", val);
    let valArray = val.split(":");
    let cur = this;
    cur.setData({
      endTime: {
        hour: parseInt(valArray[0]),
        min: parseInt(valArray[1]),
        week: cur.data.endTime.week,
        weekCN:cur.getWeekCN(cur.data.endTime.week),
      },
    })
  },


    // 获取星期的中文备注
    getWeekCN:function(week) {
      console.error('getWeekCN',week);
      if(week == '' || week.length < 7) {
        return '';
      }
      let weekArr = week.split('');
      let result = '';
      for(let i=0;i<week.length;i++) {
        if(weekArr[i] == 1) {
          result += weekArray[i]+'、';
        }
      }
      return result;
    },



  onModalTimeClick: function (e) {
    let cType = e.currentTarget.dataset.ctype;
    let cur = this;
    const curTime = cur.data.modalTime;
    if (cType === 'confirm') {
      cur.setData({
        [curTime.type]: {
          ...cur.data[curTime.type],
          hour: curTime.value[0],
          min: curTime.value[1]
        },
        // setResult: true
      })
    }
    cur.setData({
      modalTime: {
        show: false
      }
    })
  },


  onDayClick: function (e) {
    let cType = e.currentTarget.dataset.ctype;
    let cur = this;
    let week = cur.data[cType].week.substr(1, 6) + cur.data[cType].week.substr(0, 1);
    let list = this.data.list
    for (let i = 0; i < list.length; i++) {
      let newli = 'list[' + i + '].checked';
      this.setData({
        [newli]: week.substr(i, 1) == '1' ? true : false
      })
    }
    cur.setData({
      modalDay: {
        show: true,
        type: cType,
        value: [cur.data[cType].week]
      }
    })
  },



  onModalDayClick: function (e) {
    let cType = e.currentTarget.dataset.ctype;
    let cur = this;
    const curDay = cur.data.modalDay;
    if (cType === 'confirm') {
      let week = '';
      let selectWeek = '';
      for (var i = 0; i < this.data.list.length - 1; i++) {
        if (this.data.list[i].checked) {
          week += '1'
          selectWeek += " " + this.data.list[i].name;
        } else {
          week += '0'
        }
      }
      if (this.data.list[this.data.list.length - 1].checked) {
        week = '1' + week;
        selectWeek += " "+this.data.list[this.data.list.length - 1].name
      } else {
        week = '0' + week;
      }

      if (curDay.type == 'startTime') {
        cur.setData({
          modalDay: {
            show: false
          },
          startSelectWeek: selectWeek
        })
      } else {
        cur.setData({
          modalDay: {
            show: false
          },
          endSelectWeek: selectWeek
        })
      }


      cur.setData({
        [curDay.type]: {
          ...cur.data[curDay.type],
          week: week,
          weekCN:cur.getWeekCN(week),
        },
      })
    }
    cur.setData({
      modalDay: {
        show: false
      }
    })
  },


  select: function (e) {
    let selectValue = e.currentTarget.dataset.name
    let index = e.currentTarget.dataset.index;
    let newli = 'list[' + index + '].checked';
    this.setData({
      [newli]: !this.data.list[index].checked
    })
  },

  getCharCount: function (str, char) {
    let regex = new RegExp(char, 'g'); // 使用g表示整个字符串都要匹配
    let result = str.match(regex);
    let count = !result ? 0 : result.length;
    return count;
  },

  onSaveClick: function () {
    let cur = this;
    let startWeek = cur.data.startTime.week;
    let startTimeHour = cur.data.startTime.hour;
    let startTimeMin = cur.data.startTime.min;

    let endWeek = cur.data.endTime.week;
    let endTimeHour = cur.data.endTime.hour;
    let endTimeMin = cur.data.endTime.min;
    
    let startCount = this.getCharCount(startWeek, '1');
    let endCount = this.getCharCount(endWeek, "1");
    if (startCount < 1 || endCount < 1) {
      util.showToast('请选择星期');
      return;
    }
    // if (startCount != endCount) {
    //   util.showToast('开始星期和关闭日期不匹配');
    //   return;
    // }

    // // 开始第一个
    // let startIndex = startWeek.indexOf('1');
    // let endIndex = startWeek.indexOf('1');
    // if(startIndex == endIndex) {
    //   // 同一天
    //   if (startTimeHour > endTimeHour || (startTimeHour == endTimeHour && startTimeMin >= endTimeMin)) {
    //     util.showToast('开始时间不能大于关闭时间');
    //     return;
    //   }
    // }


    // while(startIndex == -1) {
    //   startIndex = startWeek.indexOf('1',startIndex+1);
    // }


    // this.setData({
    //   startTime: {
    //     hour: this.data.startTime.hour,
    //     min: this.data.startTime.min,
    //     week: week
    //   },
    //   endTime: {
    //     hour: this.data.endTime.hour,
    //     min: this.data.endTime.min,
    //     week: week
    //   }
    // })

    console.log("startTime", this.data.startTime, this.data.endTime);
    util.setResultData('pages/detail/detail', {
      index: cur.data.index,
      startTime: cur.data.startTime,
      endTime: cur.data.endTime
    })
    wx.navigateBack({
      delta: 1,
    })
  },




  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    // let cur = this;
    // if (cur.data.setResult) {
    //   util.setResultData('pages/detail/detail', {
    //     index: cur.data.index,
    //     startTime: cur.data.startTime,
    //     endTime: cur.data.endTime
    //   })
    // }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },



})