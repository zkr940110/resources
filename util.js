/*
 * 根据键名和对应的值从目标数组中返回指定对象
 * @param { Array } json 目标数组
 * @param { String } key 需要获取对象的其中一个属性名
 * @param { String } value 目标数组的子对象中 key 对应的值
 * @return { Object } 包含指定值的子对象
 */
function getJsonByKey(array, key, value) {
    if (Array.isArray(array)) {
        for (var i = 0; i < array.length; i++) {
            if (array[i][key] === value) {
                return array[i];
            }
        }
    } else {
        return null;
    }
}

/*
 * 根据标签对象生成带有lay-filter的select标签
 * @param { Object } tagInfo 当前任务标签的对应的配置对象
 * @param { filter } filter 生成layui框架的过滤符
 * @return { Object } select Dom对象
 */

function createSelect(tagInfo, filter, checking) {
    var select = document.createElement('select'),
        option;

    select.appendChild(getOption('', '请选择'));
    for (var i = 0; i < tagInfo.optionalValues.length; i++) {
        option = getOption(tagInfo.optionalValues[i].value, tagInfo.optionalValues[i].value);
        tagInfo.optionalValues[i].defaultChecked && option.setAttribute('checked', 'checked');
        select.appendChild(option);
    }
    select.setAttribute('lay-filter', filter);
    select.setAttribute('name', filter);
    select.setAttribute('lay-verify', 'required');
    checking && select.setAttribute('disabled', true);
    return select;
}

/*
 * 根据对应的value 和 text 生成option标签
 * @param { String } value option标签的value属性值
 * @param { String } text option标签的显示文本
 * @return { Object } option Dom对象
 */

function getOption(value, text) {
    var option = option = document.createElement('option');
    option.value = value.split('/').length > 1 ? value.split('/')[1] : value;
    option.innerText = text.split('/').length > 1 ? text.split('/')[0] : text;
    return option;
}

/*
 * 根据对应的value 和 text 生成option标签
 * @param { Object } can canvas对象
 * @param { Array } coords 坐标数组
 * @param { Boolbean } flag true=矩形  false=多边形
 */

function drawClothBox(can, coords, flag) {
    var ctx = can.getContext('2d');
    ctx.clearRect(0, 0, can.width, can.height);
    ctx.strokeStyle="#ff0000"
    if (!flag) {
        ctx.beginPath();
        for (var i = 0; i < coords.length; i++) {
            if (i === 0) {
                ctx.moveTo(coords[i].x, coords[i].y);
            } else {
                ctx.lineTo(coords[i].x, coords[i].y);
            }
        }
        ctx.closePath();
    } else {
        ctx.rect(coords[0].x, coords[0].y, coords[2].x - coords[0].x, coords[3].y - coords[0].y)
    }
    ctx.stroke();
}

/*
 * 判断坐标数组是否能围成一个矩形
 * @param { Array } coords 做标数组
 * @return { Boolbean } true=是 false=否
 */

function checkPolygonIsRect(coords) {
    var getSpace = function(arg1, arg2) {
        return Math.pow(arg2.x - arg1.x, 2) + Math.pow(arg2.y - arg1.y, 2);
    }

    if (coords.length !== 4) {
        return false;
    } else if (getSpace(coords[0], coords[2]) !== getSpace(coords[1], coords[3])) { // 对顶点间距不相等
        return false;
    } else {
        return true;
    }
}

/*
 * 获取鼠标相对 ulFlatItem_wrapper标签的相对位置
 * @param { Obecjt } e 事件对象
 * @return { Object } 相对位置对象
 */

function getRelativeShift(e) {
    var offset = {
        x: e.offsetX,
        y: e.offsetY
    }
    var parent = e.target;
    while(!$(parent).hasClass('ulFlatItem_wrapper')) {
        offset.x += parent.offsetLeft;
        offset.y += parent.offsetTop;
        parent = parent.offsetParent;

        if (parent.tagName.toUpperCase() === 'BODY' || parent.tagName.toUpperCase() === 'HTML') {
            break;
        }
    }
    return offset;
}

/**
 * 隐藏任务条目，并取消选中
 * @param {Array} key
 */
function setItemsHidden(keys) {
    keys.forEach(function(k) {
        $('#task_' + k).hide().attr('data-locked', 'true').find('input[type="checkbox"]').prop('checked', false);
    })
}

/**
 * 获得指定type对应的input类型
 * @param {String} type 任务类型的type
 * @return {String} 返回对应的input的类型
 */
function getInputType(type) {
    var typeJson = {
        SINGLE_CHOICE: 'radio',
        MULTI_CHOICE: 'checkbox',
        TEXT: 'text'
    }

    return typeJson[type];
}


/**
 * 获取唯一id
 * @return {String} id
 */
function getUniqueId() {
    return Date.now() + (function(n) {
        var str = '';

        for (var i = 0; i < n; i++) {
            str += Math.floor(Math.random() * 10);
        }
        return str;
    }(6))
}
/**
 * 获取产品类目下拉框元素
 * @param {Array} arr option数组
 * @param {Number} i select在父元素中的顺序
 * @return {Object} selectDOM对象
 */
function getSelectByArray(arr, index) {
    var select = document.createElement('select'),
        option;

    select.appendChild(getOption('', '请选择或搜索'));
    for (var i = 0; i < arr.length; i++) {
        option = getOption(arr[i], arr[i]);
        select.appendChild(option);
    }
    select.setAttribute('lay-filter', 'subTrade' + index);
    select.setAttribute('lay-search', '');
    select.setAttribute('name', 'subTrade' + index);
    select.setAttribute('id', 'category' + index);
    return select;
}

/**
 *
 * @param {Object} tagInfo 标签信息
 * @param {Number} i 该选项在 tagInfo.optionalValues 中的位置
 */
function getInputElement(tagInfo, i) {
    var input = document.createElement('input');
    input.setAttribute('type', getInputType(tagInfo.type));
    if (tagInfo.type === 'TEXT') {
        input.setAttribute('placeholder', '请输入' + tagInfo.name);
        input.setAttribute('class', 'layui-input');
    } else {
        input.setAttribute('lay-skin', 'primary');
        input.setAttribute('title', tagInfo.optionalValues[i].value);
        input.setAttribute('value', tagInfo.optionalValues[i].value);
    }
    input.setAttribute('name', tagInfo.code);

    return input;
}

/**
 * 获取两个元素之间的距离、角度、中心点
 * @param {ele} ele
 * @param {ele1} ele1
 */
function getSpace(ele, ele1) { // 获取两点之间的距离、角度、中心点
    var length,
        angle;

    length = Math.sqrt(Math.pow($(ele).position().left - $(ele1).position().left, 2) + Math.pow($(ele).position().top - $(ele1).position().top, 2));
    angle = Math.acos(($(ele).position().left - $(ele1).position().left) / length) * 180 / Math.PI;

    if ($(ele).position().top - $(ele1).position().top < 0) {
        angle = -angle;
    } else if (($(ele).position().top - $(ele1).position().top == 0) && ($(ele).position().left - $(ele1).position().left < 0)) {
        angle = 180;
    }

    return {
        angle: angle,
        length: length,
        center: {
            x: ($(ele).position().left + $(ele1).position().left) / 2,
            y: ($(ele).position().top + $(ele1).position().top) / 2
        }
    }
}

/**
 *
 * @param {Array} valueList style数组
 * @return {String} 字符串格式的style描述
 */
function getStyleText(valueList) {
    var str = [];
    valueList.forEach(function (value, i) {
        var key = Object.keys(value)[0];
        str.push((i === 0 ? '' : '、') + '<span>' + key + ' ' + value[key] + '</span>');
    })
    return str.join('');
}

/**
 * 获取鼠标相对 className标签的相对位置
 * @param { Obecjt } e 事件对象
 * @return { Object } 相对位置对象
 */

function getRelativePos(e, className) {
    var offset = {
        x: e.offsetX,
        y: e.offsetY
    }
    var parent = e.target;
    while(!$(parent).hasClass(className)) {
        offset.x += parent.offsetLeft;
        offset.y += parent.offsetTop;
        parent = parent.offsetParent;

        if (parent.tagName.toUpperCase() === 'BODY' || parent.tagName.toUpperCase() === 'HTML') {
            break;
        }
    }
    return offset;
}
