// var ModalEvents = function() {
// };

var ModalEvents = function(layer, layui) {
    this.$rootdom = $('#markimg');
    this.$drawshapebg = $('#markimg').find('.createShape-wrapper').eq(0);
    this.svgContainer = document.getElementById("svg_container");
    this.checking = false; // 是否在审核状态
    this.view = false;
    this.test = false;
    this.task = null; // 记录任务类型的配置参数
    this.tagInfo = null; // 记录标签类型的配置参数
    this.isDotting = false; // 记录是否正在打标
    this.links = {}; // 临时索引页面上的数据
    this.matchList = {}; // 中英文字段映射表
    this.layer = layer; // layui内建对象
    this.layui = layui; // layui内建对象
    this.modal;

    this.openModal = function(){
        var that = this;
        this.layui.form.render();
        this.modal = this.layer.open({
            type: 1,
            title: '选择' + that.tagInfo.name,
            area: ['630px', 'auto'],
            fixed: true,
            // ,skin: 'layui-layer-lan'
            scrollbar: false,
            shade: 0,
            maxmin: false,
            offset: [(($(window).height() - $('#modal_wrapper').outerHeight() - 43 - 57) / 2), ($(window).width() - 630 - 30)],
            closeBtn: 0,
            moveOut: true,
            content:$('#modal_wrapper'),
            btn: (!that.shape && !that.view && !that.checking) ? ['提交', '取消', '删除', '提交并进入下一条'] : ['提交', '取消'],
            yes: function () {
                that.modalSubmit();
            },
            btn2: function () {
                if (that.task.dotted && !that.activeSvg.hasAttribute('data-value')) {
                    $(that.activeSvg).remove();
                }

                if (that.isDrawing && !that.shapeChanging) {
                    $(that.activeSvg).remove();
                }

                that.resetModal();
            },
            btn3: function() {
                // 优化
                if (that.task.dotted) {
                    var id = $(that.activeSvg).remove().attr('data-id');
                    that.links[id] = null;
                } else {
                    var index = $.inArray(that.links[that.id], that.labelData.req_info.parts);
    
                    if (index === -1) { // 判断是否是在操作根元素，根元素不可被删除，只能删除对应属性的值
                        that.links[that.id].delete = 1;
                        that.links[that.id].attributes[that.tagInfo.code] = '';
                    } else {
                        $(that.activeSvg).remove();
                        if (that.links[that.id]._id) { // 如果是系统数据增加delete属性，否则直接删掉这条数据
                            that.links[that.id].delete = 1;
                        } else {
                            that.labelData.req_info.parts.splice(index, 1)
                        }
                    }
                    $('#handleClick').find('a[data-id="' + that.id + '"]').remove();
                }
                that.resetModal();
            },
            btn4: function() {
                that.modalSubmit(1);
                return false;
            }
        });
    };
    this.modalSubmit = function(flag) { // flag标志是否点击弹窗提交即提交整个数据
        var formData,
            $modalWrapper = $('#modal_wrapper'),
            $infolistWrapper = $('#infolist_wrapper'),
            multi_choice = [],
            hasVal = true,
            that = this;

        if (this.task.dotted) { // 关键点任务
            // 表单判空
            var formList = $('#modal_wrapper').find('.layui-input-block');
            for (var i = 0; i < formList.length; i++) {
                var name = this.task.attributes[i].code;
                var formElement = formList[i].querySelector('[name='+ name +']');
                if (formElement.tagName === 'INPUT' && (formElement.type === 'radio' || formElement.type === 'checkbox') && $(formList[i]).find('[name='+ name +']:checked').length === 0) {
                    return this.layer.alert('表单属性不能为空');
                } else if (!$(formList[i]).find('[name='+ name +']').val().trim()) {
                    return that.layer.alert('表单属性不能为空');
                }
            }

            var value;
            if (this.task.attributes[0].optionalValues.length > 5) {
                value = $('#modal_wrapper').find('.layui-input-block').eq(0).find('[name='+ this.task.attributes[0].code +']').val();
            } else {
                value = $('#modal_wrapper').find('.layui-input-block').eq(0).find('[name='+ this.task.attributes[0].code +']:checked').val();
            }

            formData = new FormData($modalWrapper.find('form')[0]);
            $(this.activeSvg).find('span').length === 0 && $(this.activeSvg).append('<span></span>');
            $(this.activeSvg).attr('data-value', value).find('span').eq(0).text(this.matchList[value]);
            this.saveFormData(formData);
        } else {
            if (!this.checking) {
                // 表单判空
                if (this.tagInfo.code === 'category') { 
                    $modalWrapper.find('select').each(function () { // 产品类目下拉框中有一个值为空则提示
                        if (!$(this).val()) {
                            hasVal = false;
                        }
                    })
                    if (!hasVal) {
                        return layer.alert('请选择正确的产品类目');
                    }
        
                    
                } else if (this.tagInfo.type !== 'TEXT') {
                    if ($('#modal_wrapper > form').find('input[name="' + this.tagInfo.code + '"]:checked').length === 0) {
                        return this.layer.alert('请选择标签');
                    }
                } else {
                    if ($('#modal_wrapper > form').find('input[name="' + this.tagInfo.code + '"]').eq(0).val().trim() === '') {
                        return this.layer.alert('请检查表单是否为空');
                    }
                }
    
                // 数据存储
                if (this.tagInfo.type !== 'MULTI_CHOICE') {
                    formData = new FormData($modalWrapper.find('form')[0]);
                } else {
                    formData = new FormData();
                    $modalWrapper.find('form').eq(0).find('input').each(function () {
                        var temp = {};
                        temp[$(this).val()] = $(this).prop('checked') ? 1 : 0;
                        multi_choice.push(temp);
                    })
                    formData.append(this.tagInfo.code, JSON.stringify(multi_choice));
                }
                // !this.shape && this.changeDone();
                this.saveFormData(formData);
    
                // 数据展示
                if (this.tagInfo.code === 'category') {
                    $infolistWrapper.find('[data-id="' + this.id + '"]').length === 0 && $infolistWrapper.append('<a href="javascript:void(0)" class="tagLink" data-id="' + this.id + '">' + this.links[this.id].attributes[this.tagInfo.code].join('-') + '</a>') || $infolistWrapper.find('[data-id="' + this.id + '"]').text(this.links[this.id].attributes[this.tagInfo.code].join('-'));
                } else {
                    $infolistWrapper.find('[data-id="' + this.id + '"]').length === 0 && $infolistWrapper.append('<a href="javascript:void(0)" class="tagLink" data-id="' + this.id + '">' + this.tagInfo.name + '_' + ($('#infolist_wrapper a').length + 1) + '</a>');
                }
            }
        }

        this.resetModal();
        flag && $('#submit').click();
    };
    this.resetModal = function() {
        if (this.task.dotted) { // 关键点任务
            this.isDotting = false;
        } else { // 普通标签任务
            this.tagInfo.code === 'category' && $('#category2').empty().append('<option value>请选择或搜索</option>');
            this.activeSvg = undefined;
            that.isDrawing = false;
            that.shapeChanging = false;
            this.$drawshapebg.empty();
        }
        $('#modal_wrapper').find('form')[0].reset();
        this.layer.closeAll();
    };
    this.openStyleTagModal = function(){
        var that = this;
        this.layui.form.render();
        this.modal = this.layer.open({
            type: 1,
            title: '选择服装风格',
            area: ['730px', 'auto'],
            fixed: true,
            // ,skin: 'layui-layer-lan',
            scrollbar: false,
            shade: 0,
            maxmin: false,
            offset: [(($(window).height() - $('#styletag').outerHeight() - 43 - 57) / 2), ($(window).width() - 730 - 30)],
            closeBtn: 0,
            moveOut: true,
            content: $('#styletag'),
            btn: (!that.shape && !that.view && !that.checking) ? ['提交', '取消', '删除', '提交并进入下一条'] : ['提交', '取消'],
            yes: function () {
                that.styleModalSubmit();
            },
            btn2: function () {
                that.shape && $(that.activeSvg).remove();
                that.resetStyleTagModal();
            },
            btn3: function() {
               
                if (that.tagInfo.supportFramed) {
                    $(that.activeSvg).remove();
                    if (that.links[that.id]._id) {
                        that.links[that.id].delete = 1;
                    } else {
                        var i = $.inArray(that.links[that.id], that.labelData.req_info.parts);
                        that.labelData.req_info.parts.splice(i, 1);
                    }
                } else {
                    that.links[that.id].delete = 1;
                    that.links[that.id].attributes[that.tagInfo.code] = '';
                }
                $('#handleClick').find('a[data-id="' + that.id + '"]').eq(0).closest('.layui-form-item').eq(0).remove();
                that.resetStyleTagModal();
            },
            btn4: function() {
                that.styleModalSubmit(1);
                return false;
            }
        });
    };
    this.styleModalSubmit = function(flag) {
        var formData,
            valueList = [],
            $infolistWrapper = $('#infolist_wrapper'),
            $styleTag = $('#styletag');
    
        if (!this.checking) {
            if ($styleTag.find('.percentNum').length === 0) {
                return this.layer.alert('最少添加一个标签');
            }
    
            // !this.shape && this.changeDone();
            formData = new FormData();
    
            $styleTag.find('.percentNum').each(function () {
                var obj = {};
                obj[$(this).next().text().trim()] = $(this).text().trim();
                valueList.push(obj);
            })
    
            formData.append('product_style', JSON.stringify(valueList));
            this.saveFormData(formData);
    
            if ($infolistWrapper.find('a[data-id="' + this.id + '"]').length === 0) {
                $infolistWrapper.append('<div class="layui-form-item">' +
                    '<label class="layui-form-label text-left"><a href="javascript:void(0)" class="tagLink" data-id="' + this.id + '">' + this.tagInfo.name + '_' + ($('#infolist_wrapper > form > div').length + 1) + '</a></label>' +
                    '<div class="layui-input-block" style="line-height: 36px;">' + getStyleText(valueList) + '</div></div>');
            } else {
                $infolistWrapper.find('a[data-id="' + this.id + '"]').parent().next().html(getStyleText(valueList));
            }
        }
        this.layui.form.render();
        this.resetStyleTagModal();
        flag && $('#submit').click();
    };
    this.resetStyleTagModal = function() {
        this.id = '';
        this.activeSvg = undefined;
        this.isDrawing = false;
        this.$drawshapebg.empty();
        this.layer.closeAll();
        $('#styletag').find('.percentNum').remove();
        $('#styletag').find('.bg-green').removeClass('bg-green');
        $('#styletag').find('#percentList').hide();
    };
    this.saveFormData = function(formData) { // 将formdata 的数据存入本地的json变量中
        var ent = formData.entries(),
            data = [],
            pt = [],
            temp,
            width,
            height;
        
        if (this.task.dotted) { // 关键点任务
            while (items = ent.next()) {
                if (items.done) break;

                if (items.value[0] !== this.task.attributes[0].code) {
                    this.links[$(this.activeSvg).attr('data-id')][items.value[0]] = items.value[1];
                }

            }

            console.log(this.links[$(this.activeSvg).attr('data-id')]);
        } else { // 普通标签任务
            while (items = ent.next()) {
                if (items.done) break;
                if (this.tagInfo.code === 'product_style') { // 产品风格特殊处理
                    data.push(items.value[1])
                } else if (this.tagInfo.code === 'category') { // 产品类目特殊处理
                    data.push(items.value[1]);
                } else if (this.tagInfo.type === 'MULTI_CHOICE') {
                    data = JSON.parse(items.value[1]);
                } else {
                    data.push(items.value[1]);
                }
            }

            var obj = {};

            if (!this.links[this.id]) {
                this.links[this.id] = {
                    attributes: {},
                    polygon: {
                        pt: []
                    },
                    parts: []
                }
                this.labelData.req_info.parts.push(this.links[this.id]);
            }

            obj[this.tagInfo.code] = (this.task.code === 'product' && this.tagInfo.code === 'product_style') ? JSON.parse(data) : data;
            $.extend(this.links[this.id].attributes, obj);

            if (this.tagInfo.supportFramed) {
                this.links[this.id].polygon.pt = this.getSVGPoints();
            }
        } 
        
    };
    this.openSendBackModal = function() {
        var that = this;
        this.layer.open({
            type: 1,
            title: '请填写',
            area: ['630px', 'auto'],
            fixed: true,
            // skin: 'layui-layer-lan',
            scrollbar: false,
            shade: 0,
            maxmin: false,
            offset: [(($(window).height() - $('#send_back').outerHeight() - 43 - 57) / 2), ($(window).width() - 630 - 30)],
            closeBtn: 0,
            moveOut: true,
            content:$('#send_back'),
            btn: ['提交', '取消'],
            yes: function () {
                if (!$('#send_back textarea').val().trim()) {
                    return that.layer.alert('退回原因不能为空');
                }
                that.doSendBack();
            },
            btn2: function () {
                $('#send_back').find('form')[0].reset();
            }
        });
    };
    this.openErrorModal = function() {
        var that = this;
        this.layer.open({
            type: 1,
            title: '请填写',
            area: ['630px', 'auto'],
            fixed: true,
            // skin: 'layui-layer-lan',
            scrollbar: false,
            shade: 0,
            maxmin: false,
            offset: [(($(window).height() - $('#error_modal').outerHeight() - 43 - 57) / 2), ($(window).width() - 630 - 30)],
            closeBtn: 0,
            moveOut: true,
            content:$('#error_modal'),
            btn: ['提交', '取消'],
            yes: function () {
                console.log('报错');
                that.doSendError();
            },
            btn2: function () {
                $('#error_modal').find('form')[0].reset();
            }
        });
    };
    this.loadErrorModal = function() {
        var that = this;
        this.layer.open({
            type: 1,
            title: '图片加载失败',
            area: ['630px', 'auto'],
            fixed: true,
            // skin: 'layui-layer-lan',
            scrollbar: false,
            shade: 0.4,
            maxmin: false,
            offset: [(($(window).height() - $('#error_modal').outerHeight() - 43 - 57) / 2), (($(window).width() - 630) / 2)],
            closeBtn: 0,
            moveOut: true,
            content:'',
            btn: ['我再试试', '直接报错'],
            yes: function () {
                window.location.reload();
            },
            btn2: function () {
                $('#error_modal').find('textarea').val('图片不存在');
                that.doAjaxSendError();
            }
        });
    };
    this.redirect = function(flag) {
        that.redirectToNext();
    };
    this.redirectToNext = function() {
        var that = this;
        var url;
        console.log('测试' + this.test)
        if (this.test) {
            url = this.baseUrl + '/' + this.variable.adminId + '/' +this.variable.attributeId + '/' + this.variable.taskId + '/next?type=' + this.variable.type;
        } else {
            url = this.baseUrl + '/' + this.variable.attributeId + '/' + this.variable.trackingId + '/next?type=' + this.variable.type;
        }

        $.ajax({
            'url': url,
            'type': 'get',
            'dataType': 'json',
            'success': function (data) {

                var nextTrackingId = data.data;
                if (nextTrackingId) {
                    var nextUrl;

                    if (that.test) {
                        nextUrl = that.baseViewUrl + '/' + that.variable.adminId + '/' + that.variable.attributeId + '/' + nextTrackingId + '?adminId=' + that.variable.adminId + '&attributeId=' + that.variable.attributeId + '&taskId=' + nextTrackingId + '&type=' + this.variable.type;
                    } else {
                        nextUrl = that.baseViewUrl + '/' + that.variable.attributeId + '/' + nextTrackingId + '?attributeId=' + that.variable.attributeId + '&trackingId=' + nextTrackingId + '&type=' + this.variable.type;
                    }
                    window.location = nextUrl;
                } else {
                    that.layer.alert('当前标签类型任务全部处理完成, 点击前往任务统计列表', function () {
                        window.location = that.statisticsUrl;
                    });
                }
            },
            'error': function (response) {

                that.alertErrorMessage({}, response.responseJSON.errorMessage, response.responseJSON.errorCode, "未知错误");
            }
        });
    };
    this.abandonTracking = function() {
        var that = this;
        that.layer.confirm('确认放弃当前任务?', function (index) {

            that.layer.close(index);
            $.ajax({
                'url': that.baseUrl + '/' + that.variable.attributeId + '/' + that.variable.trackingId + '/abandoned?type=' + this.variable.type,
                'type': 'POST',
                'data': {
                    '_method': 'PUT'
                },
                'dataType': 'json',
                'success': function (data) {

                    that.redirect(0);
                },
                'error': function (response) {

                    that.alertErrorMessage({}, response.responseJSON.errorMessage, response.responseJSON.errorCode, "未知错误");
                }
            });
        });
    };
    this.doSendError = function() {
        var that = this;
        
        that.doAjaxSendError();
    };
    this.doAjaxSendError = function() {
		var that = this;		
        $.ajax({
            'url': this.baseUrl + '/' + this.variable.attributeId + '/' + this.variable.trackingId + '/illegal?type=' + this.variable.type,
            'type': 'POST',
            'data': $('#error_modal form').serialize(),
            'dataType': 'json',
            'success': function (data) {

                that.redirect(0);
            },
            'error': function (response) {

                that.alertErrorMessage({}, response.responseJSON.errorMessage, response.responseJSON.errorCode, "未知错误");
            }
        });
    };
    this.doSendBack = function() {
        var that = this;
        
        $.ajax({
            'url': that.baseUrl + '/' + that.variable.attributeId + '/' + that.variable.trackingId + '/unqualified?type=' + this.variable.type,
            'type': 'POST',
            'data': $('#send_back form').serialize(),
            'dataType': 'json',
            'success': function (data) {

                that.redirect(0);
            },
            'error': function (response) {

                that.alertErrorMessage({}, response.responseJSON.errorMessage, response.responseJSON.errorCode, "未知错误");
            }
        });
    }
    this.alertErrorMessage = function(a, c, b, d){
        a && b && "undefined" != typeof a[b] ? this.layer.alert(a[b]) : c ? this.layer.alert(c): this.layer.alert(d)
    };
}
