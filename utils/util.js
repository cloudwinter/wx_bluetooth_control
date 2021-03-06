const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

/**
 * 判断对象是否是数组
 */
function isArray(o) {
  return Object.prototype.toString.call(o) == '[object Array]';
}

function showToast(msg) {
  wx.showToast({
    title: msg,
    icon: 'none',
    duration: 3000
  })
}

/**
 *
 * json转字符串
 */
function stringToJson(data) {
  return JSON.parse(data);
}
/**
 *字符串转json
 */
function jsonToString(data) {
  return JSON.stringify(data);
}
/**
 *map转换为json
 */
function mapToJson(map) {
  return JSON.stringify(strMapToObj(map));
}
/**
 *json转换为map
 */
function jsonToMap(jsonStr) {
  return objToStrMap(JSON.parse(jsonStr));
}


/**
 *map转化为对象（map所有键都是字符串，可以将其转换为对象）
 */
function strMapToObj(strMap) {
  let obj = Object.create(null);
  for (let [k, v] of strMap) {
    obj[k] = v;
  }
  return obj;
}

/**
 *对象转换为Map
 */
function objToStrMap(obj) {
  let strMap = new Map();
  for (let k of Object.keys(obj)) {
    strMap.set(k, obj[k]);
  }
  return strMap;
}

function setResultData(path, resultData) {
  if (path && resultData) {
    let pages = getCurrentPages();
    if (pages.length > 1) {
      let prePage = pages[pages.length - 2]
      if (prePage && prePage.route === path) {
        prePage.setData({
          resultData
        })
      }
    }
  }
}

function findIndex(arr, key, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return i;
    }
  }
  return -1;
}

function find(arr, key, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return arr[i];
    }
  }
  return null;
}

/**
 * ArrayBuffer->String
 * @param {*} ab 
 */
function ab2str(ab) {
  return String.fromCharCode.apply(null, new Uint8Array(ab));
  // var arr = Array.prototype.map.call(new Uint8Array(ab), x => x)
  // var str = ''
  // for (var i = 0; i < arr.length; i++) {
  //   str += String.fromCharCode(arr[i])
  // }
  // return str
}

/**
 * String->ArrayBuffer
 * @param {*} str 
 */
function str2ab(str) {
  var array = new Uint8Array(str.length);
  for (var i = 0, l = str.length; i < l; i++) {
    array[i] = str.charCodeAt(i);
  }
  console.log(array);
  return array.buffer;
}

// ArrayBuffer转16进度字符串示例
function ab2hex(buffer) {
  var hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('');
}

module.exports = {
  formatTime: formatTime,
  isArray: isArray,
  showToast: showToast,
  stringToJson: stringToJson,
  jsonToString: jsonToString,
  mapToJson: mapToJson,
  jsonToMap: jsonToMap,
  strMapToObj: strMapToObj,
  objToStrMap: objToStrMap,
  ab2hex,
  ab2str,
  str2ab,
  findIndex,
  find,
  setResultData
}