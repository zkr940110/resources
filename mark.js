var Mark = function(layer, layui){
    
    this.$sourceImg = $('#sourceImg'),
    this.circlePointSize = 8;
    this.initStatus = false; // 用来标记是否初始化成功
    this._shape = '';
    this.shape; // 记录形状
    this._activeSvg = null;
    this.activeSvg; // 记录svg焦点元素
    this._isDrawing;
    this.isDrawing; // 记录是否在绘制或修改矩形
    this._times = 1;
    this.times; // 记录图像缩放比
    this.shapeChanging = false; // 是否在修改形状
    this.startSize = {}; // 图片真实大小
    this.labelData = null;
    this.variable = {}; // 记录get请求参数
    this.baseUrl = '';
    this.baseViewUrl = '';
    this.statisticsUrl = '';
    ModalEvents.call(this, layer, layui);
    this.scale = 0.2;
    this.changingEle = null;
}

Mark.prototype = {
    init: function() {
        var that = this;
        this.load_init().then(function(config) {
            return that.projectBegining(config);
        }).then(function() {
            if (!that.initStatus) { // 初始化失败退出程序
                return ;
            }

            that.eventsProcessCenter(); // 自定义事件中心
            that.createTagDom(); //
            that.drawDataToCanvas(); // 将数据绘制在画布上
            // that.zoomEventListener(); // 绑定放大缩小按钮的点击事件
            if (that.task.dotted) {
                $('#shapeHandleList').hide();
            } else {
                that.shapeEventListner(); // 绑定形状选择事件
            }
            that.mouseEventListener(); // 绑定 $drawshapebg 的鼠标事件
            that.svgEventsHandler(); // 绑定svg元素点击事件
            that.guidesEvents(); // 绑定参考线事件
            that.bindClickEvents(); // 绑定点击事件         
        }).fail(function(failReason) {
            if ((typeof failReason).toLowerCase() === 'object') {
                that.alertErrorMessage(failReason)
            } else {
                if (failReason) {
                    that.loadErrorModal();
                } else {
                    that.layer.alert('任务初始化失败');
                }
            }
        })

    },
    load_init: function() { // 加载标签配置和打标数据
        var dtd = $.Deferred(),
            that = this;

        this.checking = document.body.hasAttribute('data-check') ? true: false;
        this.view = document.body.hasAttribute('data-view') ? true: false;
        this.test = document.body.hasAttribute('data-test') ? true: false;
        this.init = document.body.hasAttribute('data-test') ? true: false;

        if (this.view || this.test || this.init) {
            this.checking = true;
            $('#errorHanlder').hide();
            $('#sendBackHandler').hide();
            $('#abandonHandler').hide();
            $('#submit').hide().next('span').hide();
        }

        if (this.checking && !this.test) {
            this.baseUrl = '/admin/task/label/review/rest/backlog';
            this.baseViewUrl = '/admin/task/label/review/view/backlog';
            this.statisticsUrl = '/admin/task/label/review/view/backlog/statistics';
        } else if (this.checking && this.test) {
            this.baseUrl = '/admin/task/check/label/rest/backlog';
            this.baseViewUrl = '/admin/task/check/label/view/backlog';
            this.statisticsUrl = '/admin/task/check/label/view/backlog/statistics';
        } else if (this.checking && this.init) {
            this.baseUrl = '/admin/task/task/task/rest/label';
        } else {
            this.baseUrl = '/admin/task/label/label/rest/backlog';
            this.baseViewUrl = '/admin/task/label/label/view/backlog';
            this.statisticsUrl = '/admin/task/label/label/view/backlog/statistics';
        }


        window.location.search.substr(1).replace(/[^&?]+/g, function($1) {
            var temp = $1.split('=');
            that.variable[temp[0]] = temp[1];
        });

        $.when(this.loadLabelConfig(), this.loadLabelData(), this.loadSendBackReason()).done(function(config, data, sendBackRaeson) {
            dtd.resolve({
                config: config,
                labelData: data.value,
                parent: data.label.code,
                tag: data.attribute.code
            })

            if (sendBackRaeson) {
                $('#sendBackReasonWrapper').show();
                $('#sendBackReason').text(sendBackRaeson);
            } else {
                $('#sendBackReasonWrapper').hide();
            }
        })

        return dtd.promise();
    },
    projectBegining: function(data) { // 项目初始化数据解析
        try { // 避免data.labelData解析报错
            this.labelData = JSON.parse(data.labelData);
            this.task = getJsonByKey(data.config, 'code', data.parent);
            this.tagInfo = getJsonByKey(this.task.attributes, 'code', data.tag);
            this.initStatus = true,
            that = this;

            $('#labelName').text(this.tagInfo.name);

            if (!this.task || !this.tagInfo) {
                return this.layer.alert('任务类型数据加载失败');
            }
        } catch (err) {
            return this.layer.alert('任务类型数据加载发生未知错误');
        }

        if (this.task.dotted) { // 生成中英文匹配键值对
            this.task.attributes.forEach(function(attr) {
                if (attr.type === 'NONE') {
                    return;
                } else if (!attr.optionalValues || attr.optionalValues.length === 0) {
                    return;
                } else if (attr.optionalValues[0].value.split('/').length === 1) {
                    return;
                } else {
                    attr.optionalValues.forEach(function(val) {
                        var value = val.value.split('/');
                        that.matchList[value[1]] = value[0];
                    })
                }
            })
        }
        console.log(this.labelData.req_info.picurl);
        return this.loadImgSync(this.labelData.req_info.picurl); // 加载图片
    },
    loadLabelConfig: function() { // 加载标签配置数据
        var dtd = $.Deferred();

        // $.ajax({
        //     url: '/common/label/data',
        //     type: 'post',
        //     dataType: 'json',
        //     success: function(json) {
        //         dtd.resolve(json.data);
        //     },
        //     error: function(response) {
        //         dtd.reject({a:{}, b: response.responseJSON.errorMessage, c: response.responseJSON.errorCode, d: "未知错误"})
        //     }
        // });

        dtd.resolve(labelConfig.data); // 测试代码
        return dtd.promise();
    },
    loadLabelData: function() { // 加载标签打标数据
        var dtd = $.Deferred(),
            url;
        
        if (this.test) {
            url = this.baseUrl + '/' + this.variable.adminId + '/' +this.variable.attributeId + '/' + this.variable.taskId;
        } else if (this.init) {
            url = this.baseUrl + '/' + this.variable.taskId;
        } else {
            url = this.baseUrl + '/' + this.variable.attributeId + '/' + this.variable.trackingId;
        }

        // $.ajax({
        //     'url': url,
        //     'type': 'GET',
        //     'dataType': 'json',
        //     'success': function (data) {
        //         dtd.resolve(data.data)
        //     },
        //     'error': function (response) {
        //         dtd.reject({a:{}, b: response.responseJSON.errorMessage, c: response.responseJSON.errorCode, d: "未知错误"})
        //     }
        // });

        dtd.resolve(labelData.data); // 测试数据
        return dtd.promise();
    },
    loadSendBackReason: function() { // 加载退回原因
        var dtd = $.Deferred();

        // $.ajax({
        //     'url': this.baseUrl + '/' + this.variable.attributeId + '/' + this.variable.trackingId +  '/message',
        //     'type': 'GET',
        //     'dataType': 'json',
        //     'success': function (data) {
        //         dtd.resolve(data.data)
        //     },
        //     'error': function (response) {
        //         dtd.resolve('')
        //     }
        // });

        // 测试数据
        var json = {"code":200,"errorCode":null,"errorMessage":null,"data":null};
        dtd.resolve(json.data);

        return dtd.promise();
    },
    loadImgSync: function(src) { // 加载图片，设置默认缩放比、记录图片真实大小
        var dtd = $.Deferred(),
            maxWidth = $('#maxBox').width(),
            maxHeight = $(window).height() - 30,
            img,
            that = this;

        img = new Image();
        img.src = src;
        img.onload = function() {
            if (this.width * maxHeight / this.height > maxWidth) {
                times = maxWidth / this.width;
            } else {
                times = maxHeight / this.height;
            }

            that.startSize = {
                w: this.width,
                h: this.height
            }

            that.times = times;
            $('.isLoading').hide();
            that.$sourceImg.attr('src', src).show();
            that.svgContainer.setAttribute('viewbox', [0, 0, that.startSize.w * that.times, that.startSize.h * that.times].join(','));
            that.svgContainer.style.width = that.startSize.w * that.times + 'px';
            that.svgContainer.style.height = that.startSize.h * that.times + 'px';
            if (that.task.dotted || that.tagInfo.supportFramed) { // 只有支持打点的和画框的任务才能放大
                $('#previewBox').css({
                    'left': that.$rootdom.offset().left + that.$rootdom.outerWidth(),
                    'top': that.$rootdom.offset().top,
                    'width': that.startSize.w * that.scale + 1,
                    'height': that.startSize.h * that.scale + 1,
                    'background-image': 'url(' + src + ')'
                }).find('svg').attr('viewbox', [0, 0, that.startSize.w, that.startSize.h].join(',')).css({
                    'width': that.startSize.w,
                    'height': that.startSize.h
                }).end().find('.createShape-wrapper').css({
                    'width': that.startSize.w,
                    'height': that.startSize.h
                })
            }
            dtd.resolve();
        }

        img.onerror = function() {
            dtd.reject('loadError');
        }

        return dtd.promise();
    },
    zoomResponse: function() { // 缩放响应处理函数
        var width = this.startSize.w * this.times,
            height = this.startSize.h * this.times;
        
        this.$rootdom.css({
            'width': width,
            'height': height
        })

        this.$sourceImg.css({
            'width': width,
            'height': height
        })

        $('#fixedLine_v').css('height', height);
        $('#fixedLine_h').css('width', width);

        this.svgContainer.setAttribute('viewbox', [0, 0, width, height].join(','))
        this.setSvgSize();
    },
    setSvgSize: function() {
        var svgDom,
            option = {},
            coords,
            links = this.links,
            that = this;

        for (var id in links) {
            svgDom = this.svgContainer.querySelector('[data-id="' + id + '"]');
            coords = links[id].polygon.pt;
            console.log(links[id])
            
            if (checkPolygonIsRect(coords)) {
                coords.sort(function(a, b) {
                    if (a.x > b.x) {
                        return 1;
                    } else if (a.x === b.x && a.y > b.y) {
                        return 1;
                    } else {
                        return 0;
                    }
                })

                option.x = coords[0].x * this.startSize.w * this.times;
                option.y = coords[0].y * this.startSize.h * this.times;
                option.width = (coords[2].x - coords[0].x) * this.startSize.w * this.times;
                option.height = (coords[3].y - coords[0].y) * this.startSize.h * this.times;
            } else {
                option.points = coords.map(function($1) {
                    return ($1.x * that.startSize.w * that.times) + ',' + ($1.y * that.startSize.h * that.times);
                }).join(' ');
            }

            for (var k in option) {
                svgDom.setAttribute(k, option[k]);
            }
        }
    },
    eventsProcessCenter: function() { // 自定义事件监听中心
        var that = this;

        this.$drawshapebg.on('defineEvent', function(e, type) {
            switch(type) {
                case 'shapeChanged':
                    // that.$drawshapebg.css('display', !that)
                    break;
                case 'statusChanged':
                    if (that.isDrawing) {
                        that.$drawshapebg.show();
                    }
                    break;
                case 'activeSvgChanged':
                    // that.$drawshapebg.empty();
                    break;
           }
        })
    },
    createTagDom: function() { // 将任务信息显示在界面上
        var wrapper = this.task.displayMode !== 'default' ? $('#modal_labelContent') : $('#noModal_labelContent'),
            labelName,
            labelContent,
            formItemWrapper,
            input,
            select,
            that = this,
            task = this.task,
            tagInfo = this.tagInfo,
            code = tagInfo.code,
            type = tagInfo.type;

        if (!task.dotted) { // 标签任务
            if (code === 'category') { // 产品类目需要特殊处理
                for (var i = 0; i < 3; i++) {
                    select = null;
                    if (i === 0) {
                        select = getSelectByArray(trades, i);
                    } else {
                        select = getSelectByArray([], i);
                    }
    
                    this.checking && select.setAttribute('disabled', true);
                    wrapper.append(select);
                }
            } else if (code !== 'product_style' && type === 'TEXT') {
                input = getInputElement(tagInfo);
                this.checking && input.setAttribute('disabled', true);
                wrapper.append(input);
            } else if (code !== 'product_style' && type !== 'TEXT') {
                tagInfo.type !== 'NONE' && tagInfo.optionalValues.forEach(function(val, i) {
                    input = getInputElement(tagInfo, i);
                    val.defaultChecked && input.setAttribute('checked', true);
                    that.checking && input.setAttribute('disabled', true);
                    wrapper.append(input);
                })
            }
    
            labelName = task.displayMode !== 'pop-up' ? $('#noModal_labelName') : $('#modal_labelName');
            labelName.text(tagInfo.name);
        } else { // 关键点任务
            if (!task.attributes || task.attributes.length === 0) {
                return;
            }
            
            wrapper = wrapper.parent();
            if (that.task.displayMode === 'default') {
                wrapper = wrapper.parent();
            }
            wrapper.empty();

            task.attributes.forEach(function(attr) {
                if (attr.type === 'NONE') { // 没有值的属性不需要渲染
                    return;
                }
                formItemWrapper = $('<div class="layui-form-item"></div>');
                labelName = $('<label class="layui-form-label text-left">' + attr.name + '</label>');
                labelContent = $('<div class="layui-input-block"></div>');

                if (attr.type === 'SINGLE_CHOICE' && attr.optionalValues.length > 5) { // 关键点名称可能很长所以改成下拉框
                    input = createSelect(attr, attr.code, 0);
                    input.setAttribute('lay-search', '');
                    labelContent.append(input);
                    this.layui.form.render('select')
                } else if (attr.type !== 'TEXT') {
                    attr.optionalValues.forEach(function(val, i) {
                        input = getInputElement(attr, i);
                        val.defaultChecked && input.setAttribute('checked', true);
                        that.checking && input.setAttribute('disabled', true);
                        labelContent.append(input);
                    })
                } else {
                    input = getInputElement(attr);
                    that.checking && input.setAttribute('disabled', true);
                    labelContent.append(input);
                }
                formItemWrapper.append(labelName, labelContent);
                wrapper.append(formItemWrapper);
            })

        }
        this.layui.form.render('select');
    },
    drawDataToCanvas: function(value) {
        var data,
            id,
            temp,
            that = this,
            labelData = this.labelData,
            code = this.tagInfo.code,
            displayMode = this.task.displayMode,
            supportFramed = this.tagInfo.supportFramed,
            links = this.links,
            layer = this.layer,
            layui = this.layui;
        
        if (labelData.req_info.delete) { // 过滤存在删除属性的任务
            return layer.alert('任务数据已被删除');
        }

        id = getUniqueId();
        links[id] = labelData.req_info;

        if (labelData.req_info.polygon.pt.length > 0) {
            this.createSvgDom(labelData.req_info.polygon.pt, id, (displayMode === 'default' || !supportFramed) ? true : false);
        }

        if (labelData.req_info.attributes[code]) {
            this.appendData2Page(labelData.req_info, id);
        }

        if (displayMode === 'default') {
            $('#submit').attr('data-id', id);
        }

        if (supportFramed && labelData.req_info.parts && labelData.req_info.parts.length > 0) { // 绘制parts数组下数据
            labelData.req_info.parts.forEach(function(req_item) {
                var id;

                if (!req_item.delete) {
                    id = getUniqueId();
                    links[id] = req_item;
                    that.createSvgDom(req_item.polygon.pt, id, true);
                    if (req_item.attributes[code]) {
                        that.appendData2Page(req_item, id);
                    }
                }
            })
        }

        if (this.task.dotted) {
            this.createDottedPoint();
        }
    },
    createDottedPoint: function() { // 在页面上绘制关键点数据
        var pos_pts = this.labelData.req_info.attributes[this.tagInfo.code],
            width = this.startSize.w * this.times,
            height = this.startSize.h * this.times,
            circlePoint,
            id;

        for (var k in pos_pts) {
            id = getUniqueId();
            circlePoint = this.getCirclePoint(width * pos_pts[k].x - this.circlePointSize / 2, height * pos_pts[k].y - this.circlePointSize / 2, k);
            $(circlePoint).attr('data-id', id);
            this.links[id] = pos_pts[k];
            this.$drawshapebg.append(circlePoint);
            this.appendData2Preview(circlePoint, 0);
        }
    },
    createSvgDom: function(coords, id, flag) {
        var shape,
            option = {},
            svg,
            that = this;


        if (id) {
            option['data-id'] = id;
        }

        if (!coords || coords.length === 0) { // 坐标不存在或者坐标长度为0
            return;
        }

        if (checkPolygonIsRect(coords)) { // 判断坐标是否可以围成一个矩形
            shape = 'rect';
            coords.sort(function(a, b) {
                if (a.x > b.x) {
                    return 1;
                } else if (a.x === b.x && a.y > b.y) {
                    return 1;
                } else {
                    return 0;
                }
            })

            option.x = coords[0].x * this.startSize.w * this.times;
            option.y = coords[0].y * this.startSize.h * this.times;
            option.width = (coords[2].x - coords[0].x) * this.startSize.w * this.times;
            option.height = (coords[3].y - coords[0].y) * this.startSize.h * this.times;
        } else {
            shape = 'polygon';
            option.points = coords.map(function($1) {
                return ($1.x * that.startSize.w * that.times) + ',' + ($1.y * that.startSize.h * that.times);
            }).join(' ');
        }

        if (!flag) {
            option['data-click'] = false;
            option.fill = 'none';
        }

        svg = this.makeSVG(shape, option);
        this.svgContainer.appendChild(svg);
        this.appendData2Preview(svg, 0);

        if (this.tagInfo.supportFramed || this.task.displayMode !== 'pop-up' || this.tagInfo.type === 'NONE') {
            return;
        }

        if (document.all) {
            svg.click();
        } else {
            var e = document.createEvent("MouseEvents");
            e.initEvent("click", true, true);
            svg.dispatchEvent(e);
        }
    },
    makeSVG: function(tag, options) { // 生成SVG标签
        var defaultOption = {
            "stroke": (function () {
                var rgbArr = [];

                for (var i = 0; i < 3; i++) {
                    rgbArr.push(Math.floor(Math.random() * 255))
                }

                return 'rgb(' + rgbArr.join(',') + ')';
            }()),
            "stroke-width": "1",
            "fill": "transparent",
            "vector-effect": "non-scaling-stroke"
        },
        el = document.createElementNS('http://www.w3.org/2000/svg', tag);

        defaultOption = $.extend(defaultOption, options);

        for (var k in defaultOption) {
            el.setAttribute(k, defaultOption[k]);
        }

        // el.setAttribute('class', 'active');
        return el;
    },
    appendData2Page: function(data, id) { // 将标签数据展示到页面上
        var that = this,
            code = this.tagInfo.code,
            wrapper = $('#infolist_wrapper'),
            content;

        if (code === 'category') {
            wrapper.append('<a href="javascript:void(0)" class="tagLink" data-id="' + id + '">' + data.attributes[code].join('-') + '</a>');
        } else if (code === 'product_style') {
            content = (function () {
                var str = [];
                data.attributes[code].forEach(function (val, i) {
                    var key = Object.keys(val)[0];
                    str.push( (i === 0 ? '' : '、') + '<span>' + key +' '+ val[key] + '</span>');
                })
                return str.join('');
            }());
            wrapper.append('<div class="layui-form-item">' + 
            '<label class="layui-form-label text-left"><a href="javascript:void(0)" class="tagLink" data-id="' + id + '">' + this.tagInfo.name + '_' + ($('infolist_wrapper > div').length + 1) + '</a></label>' +
            '<div class="layui-input-block" style="line-height: 36px;">' + content + '</div></div>');
        } else if (this.task.displayMode === 'pop-up' && this.tagInfo.type !== 'NONE') {
            wrapper.append('<a href="javascript:void(0)" class="tagLink" data-id="' + id + '">' + this.tagInfo.name + '_' + ($('#infolist_wrapper a').length + 1) + '</a>');
        }
    },
    zoomEventListener: function() { // 缩放事件
        var that = this;

        $('#zoomList').on('click', 'li', function() {
            var type = $(this).attr('data-click');

            if (that.isDrawing) {
                return that.layer.alert('请先退出编辑模式');
            }

            switch(type) {
                case 'zoomin':
                    if (that.times >= 1.2) {
                        that.layer.alert('不能再放大了');
                    } else {
                        that.times += 0.1;
                    }
                    break;
                case 'zoomout':
                    if (that.times <= 0.1) {
                        that.layer.alert('不能再缩小了');
                    } else {
                        that.times -= 0.1;
                    }
                    break;
            }
        })
    },
    shapeEventListner: function() { // 形状选择事件
        var that = this;

        $('#shapeHandleList').on('click', 'li', function(){
			if (!that.initStatus || that.checking || !that.tagInfo.supportFramed) { // 初始化失败不允许选择形状
				return ;
            }

			if (that.isDrawing) {
				return ;
			}
			$(this).addClass('choose').siblings().removeClass('choose');
			that.shape = $(this).attr('data-click');
        })
    },
    mouseEventListener: function() { // 鼠标事件监听
        var that = this;

        this.$drawshapebg.on('mousedown', function(e) {
            if (that.task.dotted) { // 打点任务

                if (that.isDotting) {
                    return that.layer.alert('请先完成当前关键点');
                }

                if (that.shapeChanging) {
                    return that.layer.alert('请先完成当前关键点'); 
                }

                if (!$(e.target).is(this)) {
                    that.shapeChanging = true;
                    that.activeSvg = e.target;
                    that.isDotting = true;
                } else {
                    that.isDotting = true;
                }
                
                that.dottedEventsHandler(e);
            } else { // 其他任务
                if (that.shapeChanging && $(e.target).hasClass('createShape-wrapper')) {
                    that.shapeChanging = false;
                    that.isDrawing = false;
                    return;
                }

                if (e.button === 0) { // 左键绘制形状
                    that.mouseLeftHandler(e);
                } else if (e.button === 2) { // 右键修改形状
                    that.contextmenuHandler(e); 
                }
            }
        })

        this.$drawshapebg.contextmenu(function(e) { // 阻止右键默认事件
            e.preventDefault();
        })

        $(that.svgContainer).contextmenu(function(e) { // 阻止右键默认事件
            e.preventDefault();
        })
    },
    guidesEvents: function() { // 参考线
        var line_h = $('#line_h'),
            line_v = $('#line_v'),
            that = this,
            left,
            top;

        var mouseMoveHanlder = function (e) {
            if ($(e.target).closest('.markimg').length > 0) {
                var offset = getRelativePos(e, 'markimg');

                if (that.task.dotted || that.tagInfo.supportFramed) { // 只有打框或打点的任务才支持放大
                    if (!that.isDrawing && !that.isDotting && !that.shapeChanging) {
                        left = -offset.x / that.times + that.startSize.w * that.scale / 2;
                        top = -offset.y / that.times + that.startSize.h * that.scale / 2;
                        $('#previewBox').css('background-position', left + 'px ' + top + 'px').find('svg').css({
                            left: left,
                            top: top
                        }).end().find('.createShape-wrapper').css({
                            'left': left,
                            'top': top
                        });
                    } else {
                        line_h.show().css('left', offset.x / that.times + left - 1);
                        line_v.show().css('top', offset.y / that.times + top - 1);
                    }

                }
                // fixedLine_h.css('top', offset.y);
                // fixedLine_v.css('left', offset.x);
            }
        };
        var mouseUpHandler = function (e) {
            line_h.hide();
            line_v.hide();
        };

        this.$rootdom.on('mouseenter', function(e) {
            var offset = getRelativePos(e, 'createShape-wrapper');

            if (offset.x < 1 || offset.y < 1 || offset.x === $(this).width() || offset.y === $(this).height()) {
                return;
            }
            // fixedLine_h.show();
            // fixedLine_v.show();
            if (that.task.dotted || that.tagInfo.supportFramed) { // 只有打框或打点的任务才支持放大
                $('#previewBox').show();
            }

            $(document.body).on('mousemove', mouseMoveHanlder).on('mouseup', mouseUpHandler)

        }).on('mouseleave', function() {
            $('#previewBox').hide();

            $(document.body).off('mousemove', mouseMoveHanlder);
            $(document.body).off('mouseup', mouseUpHandler);
        })
    },
    contextmenuHandler: function(e) { // 鼠标右键处理函数
        var that = this;

        if (!$(e.target).hasClass('createShape-wrapper')) {
            this.shapeChanging = false;
            return;
        }

        this.shapeChanging = true;
        this.$drawshapebg.hide();

        $(this.svgContainer).on('mouseup', function(e) {
            if (e.target.tagName.toUpperCase() === 'SVG' || e.target.hasAttribute('data-click')) {
                that.$drawshapebg.show();
            } else {
                if (document.all) {
                    e.target.click();
                } else {
                    var event = document.createEvent("MouseEvents");
                    event.initEvent("click", true, true);
                    e.target.dispatchEvent(event);
                }   
            }
            
            $(that.svgContainer).off('mouseup');
        })
    },
    mouseLeftHandler: function(e) { // 鼠标左键处理函数
        var mousePos = {};

        if (!this.tagInfo.supportFramed) { // 任务不支持打标，退出
            return;
        }

        if (this.checking) { // 审核状态下不支持新增弹窗
            return;
        }

        if (this.shapeChanging) {
            this.changingEventsHandler(e); // 绑定元素修改事件
        } else {

            if (!this.shape) { // 没选择形状不允许画框
                return;
            }

            this.isDrawing = true;
            if (this.shape === 'rect') {
                mousePos = getRelativePos(e, 'createShape-wrapper');
                this.drawRect(mousePos);
            } else {
                this.drawPolygon();
            }
        }
    },
    dottedEventsHandler: function(e) {
        var that = this,
            $previewDrawBg = $('#previewBox').find('.createShape-wrapper').eq(0);

        if (this.shapeChanging) { // 修改关键点位置
            this.$drawshapebg.on('mousemove', function(e) {
                var offset = getRelativePos(e, 'createShape-wrapper');

                $(that.activeSvg).css({
                    'left': offset.x - that.circlePointSize / 2,
                    'top': offset.y - that.circlePointSize / 2
                })
            })
        }
        

        this.$drawshapebg.on('mouseup', function(e) {
            $('#modal_wrapper > form')[0].reset();

            if (!that.shapeChanging) {
                var offset = getRelativePos(e, 'createShape-wrapper'),
                    id = getUniqueId(),
                    circlePoint = that.getCirclePoint(offset.x - that.circlePointSize / 2,offset.y - that.circlePointSize / 2);

                circlePoint.attr('data-id', id);
                $(this).append(circlePoint);
                that.activeSvg = circlePoint;
                that.isDotting = true;
            }
            if (that.task.displayMode === 'pop-up') {
                var valList;

                id = id || $(that.activeSvg).attr('data-id');
                if (that.activeSvg.hasAttribute('data-value')) { // 该关键点存在对应属性
                    valList = that.links[id];
                    $('#modal_wrapper').find('.layui-input-block').each(function(i) {
                        var name = that.task.attributes[i].code;
                        var formElement = $(this).find('[name=' + name + ']')[0];
                        if (i !== 0) { // 处理其他属性
                            if (formElement.tagName.toUpperCase() === 'INPUT' && formElement.type === 'radio' && valList[name]) {
                                $(this).find('[name="' + name + '"][value="' + valList[name] + '"]').prop('checked', true);
                            } else if (formElement.tagName.toUpperCase() === 'INPUT' && formElement.type === 'radio' && !valList[name]) {
                                $(this).find('[name="' + name + '"]').prop('checked', false);
                            }
                        } else { // 处理关键点名称
                            $(formElement).find('option[value="' + that.$drawshapebg.find('.circlePoint[data-id="'+ id +'"]').attr('data-value') + '"]').prop('selected', true);
                        }
                    })
                }

                console.log(id, that.activeSvg)
                that.openModal();
            }
            that.layui.form.render();
            // 给预览区域增加关键点
            that.appendData2Preview(that.activeSvg, 0);
            that.shapeChanging = false;
            that.$drawshapebg.off('mousemove');
            that.$drawshapebg.off('mouseup');
        })
    },
    changingEventsHandler: function(e) {
        var that = this,
            id,
            status;

        if (this.$drawshapebg.find('.rect').length > 0) { // 修改矩形
            var type = e.target.classList.length > 1 ? e.target.classList.value.substr(12) : e.target.classList[0],
                sp = getRelativePos(e, 'createShape-wrapper'), // 鼠标相对位移
                $rect = this.$drawshapebg.find('.rect').eq(0),
                ss = { // 初始状态记录
                    x: sp.x,
                    y: sp.y,
                    l: $rect.position().left,
                    t: $rect.position().top,
                    w: $rect.width(),
                    h: $rect.height()
                },
                max = {
                    w: this.$drawshapebg.width(),
                    h: this.$drawshapebg.height()
                };

            this.$drawshapebg.on('mousemove', function (e) {
                var offset = getRelativePos(e, 'createShape-wrapper'),
                    left = ss.l,
                    top = ss.t,
                    width = ss.w,
                    height = ss.h,
                    circleList,
                    index = 0;

                switch (type) {
                    case 'left-top':
                        left = ss.l + (offset.x - sp.x);
                        top = ss.t + (offset.y - sp.y);
                        left = left < 0 ? 0 : (left > ss.l + ss.w ? ss.l + ss.w : left);
                        top = top < 0 ? 0 : (top > ss.t + ss.h ? ss.t + ss.h : top);
                        width = ss.w - (left - ss.l);
                        height = ss.h - (top - ss.t);
                        break;
                    case 'left':
                        left = ss.l + (offset.x - sp.x);
                        left = left < 0 ? 0 : (left > ss.l + ss.w ? ss.l + ss.w : left);
                        width = ss.w - (left - ss.l);
                        break;
                    case 'left-bottom':
                        left = ss.l + (offset.x - sp.x);
                        left = left < 0 ? 0 : (left > ss.l + ss.w ? ss.l + ss.w : left);
                        width = ss.w - (left - ss.l);
                        height = ss.h + (offset.y - sp.y);
                        height = height + ss.t > max.h ? max.h - ss.t : height;
                        break;
                    case 'top':
                        top = ss.t + (offset.y - sp.y);
                        top = top < 0 ? 0 : (top > ss.t + ss.h ? ss.t + ss.h : top);
                        height = ss.h - (top - ss.t);
                        break;
                    case 'bottom':
                        height = ss.h + (offset.y - sp.y);
                        height = height + ss.t > max.h ? max.h - ss.t : height;
                        break;
                    case 'right-top':
                        top = ss.t + (offset.y - sp.y);
                        top = top < 0 ? 0 : (top > ss.t + ss.h ? ss.t + ss.h : top);
                        width = ss.w + (offset.x - sp.x);
                        width = width + ss.l > max.w ? max.w - ss.l : width;
                        height = ss.h - (top - ss.t);
                        break;
                    case 'right':
                        width = ss.w + (offset.x - sp.x);
                        width = width + ss.l > max.w ? max.w - ss.l : width;
                        break;
                    case 'right-bottom':
                        width = ss.w + (offset.x - sp.x);
                        width = width + ss.l > max.w ? max.w - ss.l : width;
                        height = ss.h + (offset.y - sp.y);
                        height = height + ss.t > max.h ? max.h - ss.t : height;
                        break;
                    default:
                        left = ss.l + (offset.x - sp.x);
                        top = ss.t + (offset.y - sp.y);
                        left = left < 0 ? 0 : (left > max.w - ss.w ? max.w - ss.w : left);
                        top = top < 0 ? 0 : (top > max.h - ss.h ? max.h - ss.h : top);
                }

                $rect.css({
                    'left': left,
                    'top': top,
                    'width': width + 'px',
                    'height': height + 'px'
                })

                circleList = that.$drawshapebg.find('.circlePoint');

                for (var i = left; i <= left + width;) {
                    for (var j = top; j <= top + height;) {
                        circleList.eq(index).css({
                            'left': i - that.circlePointSize / 2,
                            'top': j - that.circlePointSize / 2
                        })

                        j += height / 2;
                        index++
                    }
                    i += width / 2;
                }

            })
        } else { // 修改多边形
            var node = $(e.target);
            var index = this.$drawshapebg.find('.circlePoint').index(node);
            that.$drawshapebg.on('mousemove', function (e) {
                var offset = getRelativePos(e, 'createShape-wrapper');

                node.css({
                    'left': offset.x - that.circlePointSize / 2,
                    'top': offset.y - that.circlePointSize / 2
                })

                that.changeLine(index);
            })
        }

        var mouseUpHandler = function (e) {
            that.changeDone();
            that.appendData2Preview(that.activeSvg, 0);            
            $(that.$drawshapebg).off('mousemove');
            $(document.body).off('mouseup', mouseUpHandler);
            // that.shapeChanging = false;
        }

        $(document.body).on('mouseup', mouseUpHandler);
    },
    svgEventsHandler: function() { // 绑定svg元素点击事件
        var that = this;

        this.svgContainer.addEventListener('click', function(e) {
            if (!that.checking || that.tagInfo.code !== 'product_style') {
                that.setActiveForSVG(e.target);
            }
        }, false)
    },
    setActiveForSVG: function(ele) { // 设置焦点svg元素
        var styleAim,
            percentNum,
            subTradeList,
            key,
            temp;

        this.activeSvg = ele;
        this.id = this.activeSvg.getAttribute('data-id');
        this.isDrawing = true;
        this.changeSVGdom2point(ele);

        if (!this.tagInfo.supportFramed) {
            return;
        }

        temp = this.links[this.id].attributes[this.tagInfo.code];

        if (this.tagInfo.code === 'product_style') {
            Array.isArray(temp) && temp.forEach(function (val) {
                key = Object.keys(val)[0];
                styleAim = $('#styletag').find('div[title="' + key + '"]');
                percentNum = $('<div class="percentNum"></div');
                styleAim.addClass('bg-green');
                percentNum.text(val[key]);
                percentNum.insertBefore(styleAim.find('b'));
            })

            this.openStyleTagModal();
        } else if (this.tagInfo.code === 'category') {
            Array.isArray(temp) && temp.forEach(function (val, i) {
                if (i === 0) {
                    $('#category' + i).find('option[value="' + val + '"]').prop('selected', true);
                } else if (i === 1) {
                    subTrades1.map(function (value) {
                        $('#category1').append('<option value="' + value + '" ' + (value === val ? 'selected' : '') + '>' + value + '</option>');
                    })
                    $('#category' + i).find('option[value="' + val + '"]').prop('selected', true);
                } else {
                    subTradeList = subTrades2[temp[0] + '-' + temp[1]];
                    $('#category2').empty().append('<option value>请选择或搜索</option>');
                    subTradeList.map(function (value) {
                        $('#category2').append('<option value="' + value + '" ' + (value === val ? 'selected' : '') + '>' + value + '</option>');
                    })
                }
            });
            this.openModal();
        } else {
            var form = this.task.displayMode === 'default' ? $('#not_modal_box > form') : $('#modal_wrapper > form').eq(0);
                if (this.tagInfo.type === 'SINGLE_CHOICE') {
                    form.find('[type=' + getInputType(this.tagInfo.type) + '][value="' + temp + '"]').prop('checked', true);
                } else if (this.tagInfo.type === 'MULTI_CHOICE') {
                    Array.isArray(temp) && temp.forEach(function(val) {
                        var key = Object.keys(val)[0];
                        val[key] && form.find('[type=' + getInputType(this.tagInfo.type) + '][value="' + key + '"]').prop('checked', true);
                    })
                } else {
                    form.find('[type="text"]').val(temp);
                }
                this.task.displayMode !== 'default' && this.openModal();
        }
    },
    changeSVGdom2point: function(ele) { // 将svg元素用div来显示
        var posInfo,
            that = this;
        
        if (ele.tagName.toUpperCase() === 'RECT') {
            try { // 避免svg元素属性异常导致页面卡死
                posInfo = ele.getBBox();

                if (posInfo.width === 0 || posInfo.height === 0) {
                    throw "svg rect width 和 height 为 0 时插入页面会导致浏览器卡死";
                }
            } catch(error) {
                posInfo = {};
                posInfo.x = parseFloat(ele.getAttribute('x'));
                posInfo.y = parseFloat(ele.getAttribute('y'));
                posInfo.width = parseFloat(ele.getAttribute('width'));
                posInfo.height = parseFloat(ele.getAttribute('height'));

            }

            this.$drawshapebg.append(this.createChangeRect(posInfo));
            this.$drawshapebg.find('.rect').css('cursor', 'move');
        } else if (ele.tagName.toUpperCase() === 'POLYGON') {
            posInfo = ele.getAttribute('points').split(' ');

            posInfo.map(function(item){
                that.$drawshapebg.append(that.createChangePolygon(item));
            })

            this.connectCirclePoint(-1);
        }

        ele.display = 'none';
    },
    changeLine: function(index){
        var circlePointList = this.$drawshapebg.find('.circlePoint'),
            lineList = this.$drawshapebg.find('.line'),
            circleBro = [index + 1 >= circlePointList.length ? 0 : index + 1, index - 1 < 0 ? circlePointList.length - 1 : index - 1],
            status,
            that = this;

        circleBro.forEach(function(val, i){
            status = getSpace(circlePointList.eq(val), circlePointList.eq(index));
            that.getConnectLine(status, lineList.eq(i === 0 ? index : index - 1));
        })
    },
    changeDone: function() { // 修改或绘制完成
        var svgAttr = {},
            $aimRect,
            key,
            id = this.activeSvg.getAttribute('data-id');
        
        if (this.activeSvg.tagName.toLowerCase() === 'rect') {
            $aimRect = this.$drawshapebg.find('.rect');
            svgAttr = {
                'x': $aimRect.position().left,
                'y': $aimRect.position().top,
                'width': $aimRect.outerWidth(),
                'height': $aimRect.outerHeight()
            }

        } else if (this.activeSvg.tagName.toLowerCase() === 'polygon') {
            svgAttr = {
                points: this.getPolygonPoints()
            }
        }

        for (key in svgAttr) {
            this.activeSvg.setAttribute(key, svgAttr[key]);
        }

        if (!this.links[id]) { 
            this.links[id] = {
                attributes: {},
                polygon: {
                    pt: []
                },
                parts: []
            }
        }
        this.links[id].polygon.pt = this.getSVGPoints();
        // this.shapeChanging = false;
        this.$drawshapebg.off('mousemove');
        this.$drawshapebg.off('mouseup');
    },
    getSVGPoints: function() { // 获取svg的坐标
        var pt = [],
            temp = {},
            that = this;
        console.log(this.activeSvg);
        if (!this.activeSvg.getAttribute('points')) {
            try { // 避免火狐浏览器下 svg元素display为none时获取尺寸报错
                temp = this.activeSvg.getBBox();
                if (temp.width === 0 || temp.height === 0) {
                    throw '兼容chrome下获取display为none的svg元素尺寸都为0';
                }
            } catch(e) {
                temp.x = parseFloat(this.activeSvg.getAttribute('x'));
                temp.y = parseFloat(this.activeSvg.getAttribute('y'));
                temp.width = parseFloat(this.activeSvg.getAttribute('width'));
                temp.height = parseFloat(this.activeSvg.getAttribute('height')); 
            }

            pt.push(
                {
                    x: parseFloat(temp.x + temp.width) / $(this.svgContainer).width(),
                    y: parseFloat(temp.y) / $(this.svgContainer).height()
                },
                {
                    x: parseFloat(temp.x + temp.width) / $(this.svgContainer).width(),
                    y: parseFloat(temp.y + temp.height) / $(this.svgContainer).height()
                },
                {
                    x: parseFloat(temp.x) / $(this.svgContainer).width(),
                    y: parseFloat(temp.y + temp.height) / $(this.svgContainer).height()
                },
                {
                    x: parseFloat(temp.x) / $(this.svgContainer).width(),
                    y: parseFloat(temp.y) / $(this.svgContainer).height()
                }
            )
        } else {
            this.activeSvg.getAttribute('points').split(' ').map(function(item, i){
                temp = item.split(',');
                pt.push({
                    x: parseFloat(temp[0]) / $(that.svgContainer).width(),
                    y: parseFloat(temp[1]) / $(that.svgContainer).height()
                })
            })
        }

        pt = pt.map(function(coords) {
            return {
                x: parseFloat(coords.x.toFixed(4)),
                y: parseFloat(coords.y.toFixed(4))
            }
        })

        return pt;
    },
    drawRect: function(pos) { // 绘制矩形
        var $div,
            $rect,
            that = this;

        this.id = getUniqueId();
        $div = $('<div></div>');
        $div.append(this.getCirclePoint(pos.x - this.circlePointSize / 2, pos.y - this.circlePointSize / 2));
        $rect = this.getRect(pos.x - this.circlePointSize / 2, pos.y - this.circlePointSize / 2);
        $div.append($rect);
        this.$drawshapebg.append($div);

        var mouseMoveHanlder = function(e) {
            var offset = getRelativePos(e, 'createShape-wrapper');

            $rect.css({
                width: Math.abs(offset.x - pos.x),
                height: Math.abs(offset.y - pos.y),
                left: offset.x < pos.x ? offset.x : pos.x,
                top: offset.y < pos.y ? offset.y : pos.y
            })
        };

        var mouseUpHandler = function(e) {
            var offset = getRelativePos(e, 'createShape-wrapper');

            if ($(e.target).closest('.createShape-wrapper').length === 0) {
                that.layer.alert('不能将标签画到图片以外的区域');
                that.activeSvg = null;
                that.isDrawing = false;
            } else if (pos.x === offset.x || pos.y === offset.y) {
                that.activeSvg = null;
                that.isDrawing = false;
                that.$drawshapebg.empty();
            } else {
                that.activeSvg = that.createSvgRect();
                $(that.svgContainer)[0].appendChild(that.activeSvg);
                that.appendData2Preview(that.activeSvg, 0);
                that.isDrawing = false;

                if (that.task.displayMode === 'pop-up' && that.tagInfo.type !== 'NONE') {
                    that.openModal();
                }
            }

            $(document.body).off('mousemove', mouseMoveHanlder);
            $(document.body).off('mouseup', mouseUpHandler);
        }

        $(document.body).on('mousemove', mouseMoveHanlder);
        $(document.body).on('mouseup', mouseUpHandler)
    },
    createSvgRect: function () { // 生成矩形形状
        var status = {},
            that = this;

        this.$drawshapebg.find('.rect').each(function () {
            status = {
                x: $(this).position().left,
                y: $(this).position().top,
                width: $(this).outerWidth(),
                height: $(this).outerHeight(),
                'data-id': that.id
            }
        })

        if (status.width <= 0 || status.height <= 0 ) { // 避免SVG属性错误导致的浏览器卡顿
            return console.log('svg属性错误');
        }

        return this.makeSVG('rect', status);
    },
    createChangeRect: function(posInfo) {
        var rect = $('<div class="rect"></di>'),
            array = [],
            classArray = ['left-top', 'left', 'left-bottom', 'top', 'center', 'bottom', 'right-top', 'right', 'right-bottom'],
            index = 0,
            that = this,
            left, 
            top, 
            width, 
            height;

        if ((typeof posInfo.width).toLowerCase() !== 'number' || (typeof posInfo.height).toLowerCase() !== 'number' || posInfo.width <= 0 || posInfo.height <= 0) { // 避免svg属性错误导致的浏览器卡死
            return console.log('svg属性错误');
        }

        rect.css({
            'left': posInfo.x,
            'top': posInfo.y,
            'width': posInfo.width,
            'height': posInfo.height
        })

        left = Math.round(parseFloat(posInfo.x));
        top = Math.round(parseFloat(posInfo.y));
        width = Math.round(parseFloat(posInfo.width));
        height = Math.round(parseFloat(posInfo.height));

        for (var i = left; i <= left + width;) {
            for (var j = top; j <= top + height;) {
                array.push([i, j, classArray[index]]);
                j += height / 2;
                index ++
            }

            i += width / 2;
        }

        array.map(function (item) {
            that.$drawshapebg.append(that.createCirclePoint(item));
        })

        return rect;
    },
    drawPolygon: function() {
        var that = this,
            id;

        that.$drawshapebg.on('mouseup', function(e) {
            if (!that.isDrawing) {
                return;
            }

            var spaceBetween2Points,
                connectLine,
                offset = getRelativePos(e, 'createShape-wrapper');

            if ($(e.target).hasClass('circlePoint') && $(e.target).index() === 0) {
                id = getUniqueId();
                spaceBetween2Points = getSpace(e.target, that.$drawshapebg.find('.circlePoint:last'));
                connectLine = that.getConnectLine(spaceBetween2Points);
                that.connectCirclePoint(0);
                that.activeSvg = that.createPolygon();
                $(that.svgContainer)[0].appendChild(that.activeSvg);
                that.appendData2Preview(that.activeSvg, 0);
                that.isDrawing = false;

                if (that.tagInfo.supportFramed && that.task.displayMode !== 'pop-up') {
                    // if (!that.links[that.id]) {
                    //     that.links[that.id] = that.getNewObject();
                    //     that.labelData.req_info.parts.push(that.links[that.id]);
                    // }
                    // that.links[that.id].polygon.pt = that.getSVGPoints();
                    // that.resetModal();
                } else if (that.tagInfo.code === 'product_style'){
                    // that.openStyleTagModal();
                    // that.isDrawing = true;
                } else {
                    that.openModal();
                    // that.isDrawing = true;
                }
            } else {
                that.$drawshapebg.append(that.getCirclePoint(offset.x - that.circlePointSize / 2, offset.y - that.circlePointSize / 2));
                that.connectCirclePoint(1);
                that.isDrawing = true;
            }

            $(that.$drawshapebg).off('mouseup');
        })
    },
    getCirclePoint: function(x, y, value) { // 生成circlePoint
        var $circlePoint = $('<div class="circlePoint"></di>');
        
        if (value) {
            $circlePoint.attr('data-value', value);
            $circlePoint.append('<span>' + this.matchList[value] + '</span>');
        }

        $circlePoint
            .attr('id', 'circle' + this.$drawshapebg.find('.circlePoint').length)
            .css({
                'left': x,
                'top': y
            });
    
        return $circlePoint;
    },
    getRect: function (x, y) { // 生成rect
        var rect = $('<div class="rect"></di>');
    
        rect.css({
                'left': x,
                'top': y,
                'width': 0,
                'height': 0
            });
    
        return rect;
    },
    createCirclePoint: function(array) { // 生成可拖拽的点
        var $circlePoint = $('<div class="circlePoint"></di>');

        $circlePoint.css({
            'left': array[0] - this.circlePointSize / 2,
            'top': array[1] - this.circlePointSize / 2
        }).addClass(array[2])

        array[2] === 'center' && $circlePoint.css('display', 'none');
    
        return $circlePoint;
    },
    getConnectLine: function (status, line) { // 生成多边形连接线
        var $connectLine;

        if (line) {
            $connectLine = line;
        } else {
            $connectLine = $('<div class="line"></di>');
        }
    
        $connectLine
            .css({
                'width': status.length,
                'left': status.center.x + this.circlePointSize / 2 - status.length / 2,
                'top': status.center.y + this.circlePointSize / 2,
                'transform': 'rotate(' + status.angle + 'deg)'
            });
    
        return $connectLine;
    },
    createPolygon: function () { // 生成多边形svg形状
        return this.makeSVG('polygon', {
            points: this.getPolygonPoints(),
            'data-id': this.id
        })
    },
    connectCirclePoint: function (flag) { // 链接多边形的点
        var circlePointList = this.$drawshapebg.find('.circlePoint'),
            spaceBetween2Points,
            $connectLine,
            i = 0;

        if (this.$drawshapebg.find('.circlePoint').length < 2) {
            return;
        }
        
        if (flag > 0) { // 只连接新创建的点

            for (var i = 0; i < circlePointList.length; i++) {
                if (i === circlePointList.length - 1) {
                    spaceBetween2Points = getSpace(circlePointList[i], circlePointList[i - 1]);
                    $connectLine = this.getConnectLine(spaceBetween2Points);
                    this.$drawshapebg.append($connectLine);
                }
            }

        } else if (flag === 0) {    // 闭合多边形
            spaceBetween2Points = getSpace(circlePointList[circlePointList.length - 1], circlePointList[0]);
            $connectLine = this.getConnectLine(spaceBetween2Points);
            this.$drawshapebg.append($connectLine);
        } else { // 依次链接所有的点

            for (i; i < circlePointList.length; i++) {
                spaceBetween2Points = getSpace(circlePointList.eq(i), circlePointList.eq((i !== circlePointList.length - 1 ? i + 1 : 0)));
                $connectLine = this.getConnectLine(spaceBetween2Points);
                this.$drawshapebg.append($connectLine);
            }

        }
    },
    getPolygonPoints: function(){ // 获取多边形的points属性
        var points = [],
            that = this;

        this.$drawshapebg.find('.circlePoint').each(function () {
            points.push(($(this).position().left + that.circlePointSize / 2) + ',' + ($(this).position().top + that.circlePointSize / 2))
        })
    
        return points.join(' ');
    },
    createChangePolygon: function(str) { // 创建多边形
        var $circlePoint = $('<div class="circlePoint"></di>');
        var posArr = str.split(',');

        $circlePoint.css({
            'left': parseFloat(posArr[0]) - this.circlePointSize / 2,
            'top': parseFloat(posArr[1]) - this.circlePointSize / 2
        })
    
        return $circlePoint;
    },
    bindClickEvents: function() {
        var that = this;

        $('#handleClick').on('click', '.tagLink', function(){
            var svgEle;
        
           if (that.isDrawing) {
               return shat.layer.alert('请先关闭其他标签');
           }
        
            var id = $(this).attr('data-id');
            svgEle = document.getElementById('svg_container').querySelectorAll('[data-id="' + id + '"]').item(0);
            that.$drawshapebg.empty();
            if (!that.checking || that.tagInfo.code !== 'product_style') {
                that.setActiveForSVG(svgEle);
            }
        })

        $('#submit').click(function() {
            if (that.checking) {
                return;
            }

            if (that.task.dotted) { // 打点
                var dottedList = that.$drawshapebg.find('.circlePoint'),
                    attributes;
                
                if (!that.labelData.req_info.attributes.hasOwnProperty(that.task.attributes[0].code)) {
                    that.labelData.req_info.attributes[that.task.attributes[0].code] = {};
                }
                attributes = that.labelData.req_info.attributes[that.task.attributes[0].code];
                if (dottedList.length === 0) {
                    return that.layer.alert('请添加关键点');
                }

                dottedList.each(function() {
                    var id = $(this).attr('data-id');
                    attributes[$(this).attr('data-value')] = that.links[id];
                })

            } else { // 普通打标
                if (that.task.displayMode === 'default' && that.tagInfo.type !== 'NONE') {
                    var type = that.tagInfo.type,
                        checkedItem = $('#not_modal_box > form').find('[name="' + that.tagInfo.code + '"]' + (type !== 'TEXT' ? ':checked' : ''));

                    if (type !== 'TEXT' && checkedItem.length === 0) {
                        return that.layer.alert('请选择标签');
                    } else if(type === 'TEXT' && !checkedItem.val().trim()) {
                        return that.layer.alert('请输入有效标签');
                    }

                    that.links[$(this).attr('data-id')].attributes[that.tagInfo.code] = (function(){
                        var val = [];
                        checkedItem.each(function(){
                            val.push($(this).val()); 
                        })
                
                        return val.join(',');
                    }())
                } 

                if (that.tagInfo.supportFramed) {
                    that.labelData.req_info.parts = [];
                    Array.prototype.forEach.call(that.svgContainer.childNodes, function(node) {
                        var id;

                        if (node.nodeType === 1 && !node.hasAttribute('data-click')) { // 屏蔽掉边框元素
                            id = node.getAttribute('data-id');
                            that.labelData.req_info.parts.push(that.links[id]);
                        }
                    })

                    console.log(that.labelData.req_info.parts)
                }

                if (that.tagInfo.supportFramed && that.labelData.req_info.parts.length === 0) {
                    return that.layer.alert('数据为空，不能提交1');
                } else if (!that.tagInfo.supportFramed && !that.labelData.req_info.attributes[that.tagInfo.code] && that.tagInfo.type !== 'NONE') {
                    return that.layer.alert('数据为空，不能提交2');
                }
            }

            console.log(JSON.stringify(that.labelData));
        })

        $('#sendBackHandler').click(function() {
            if (that.view) {
                return;
            }
			that.openSendBackModal();
		})

		$('#errorHanlder').click(function() {
            if (that.view) {
                return;
            }
			that.openErrorModal();
        })

        $('#abandonHandler').click(function () {
            if (that.view) {
                return;
            }
            that.abandonTracking();
        })

        if (that.test) {
            var checkNext = $('<button class="layui-btn m-r-sm"> 下一条 </button>')
            $('#submit').replaceWith(checkNext);
            checkNext.on('click', function() {
                that.redirectToNext();
            })
        }
    },
    keyBoardEvents: function() {
        var that = this;

        $(document.body).on('keyup', function(e) {
            if (e.keyCode === 38) { // 上
                if (that.shapeChanging && that.changingEle) {
                    
                } else {
                    e.preventDefault();
                    return false;
                }
            } else if (e.keyCode === 40) { // 下
                if (that.shapeChanging && that.changingEle) {

                } else {
                    e.preventDefault();
                    return false;
                }
                console.log('down');
            } else if (e.keyCode === 37) { // 左
                if (that.shapeChanging && that.changingEle) {

                } else {
                    e.preventDefault();
                    return false;
                }
                console.log('left');
            } else if (e.keyCode === 39) { // 右
                if (that.shapeChanging && that.changingEle) {

                } else {
                    e.preventDefault();
                    return false;
                }
                console.log('right');
            } else {

            }
        })
    },
    appendData2Preview: function(ele, flag) { // 将关键点或框插入预览框, flag为true则删除预览节点
        var id = ele instanceof $ ? ele.attr('data-id') : ele.getAttribute('data-id'),
            previewSvg = $('#previewBox')[0].querySelector('svg'),
            $previeDrawbg = $('#previewBox').find('.createShape-wrapper'),
            cloneNode,
            $rect,
            status = {},
            that = this;

        if ($(ele).closest('svg').length > 0) { // 插入框
            if (flag) { // 删除
                previewSvg.querySelector('[data-id="' + id + '"]').remove();
            } else { // 修改
                if (previewSvg.querySelector('[data-id="' + id + '"]')) {
                    cloneNode = previewSvg.querySelector('[data-id="' + id + '"]')
                } else {
                    cloneNode = $(ele).clone()[0];
                    previewSvg.appendChild(cloneNode);
                }

                if (!ele.getAttribute('points')) {
                    try { // 避免火狐浏览器下 svg元素display为none时获取尺寸报错
                        status = ele.getBBox();
                        if (status.width === 0 || status.height === 0) {
                            throw '兼容chrome下获取display为none的svg元素尺寸都为0';
                        }
                    } catch(e) {
                        status.x = parseFloat(ele.getAttribute('x'));
                        status.y = parseFloat(ele.getAttribute('y'));
                        status.width = parseFloat(ele.getAttribute('width'));
                        status.height = parseFloat(ele.getAttribute('height')); 
                    }

                    status.x = status.x / this.times;
                    status.y = status.y / this.times;
                    status.width = status.width / this.times;
                    status.height = status.height / this.times;
                } else {
                    status.points = ele.getAttribute('points').split(' ').map(function(item, i){
                        temp = item.split(',').map(function(pt) {
                            return parseFloat(pt) / that.times;
                        }).join(',');

                        return temp;
                    }).join(' ');
                }
                
                for (var j in status) {
                    cloneNode.setAttribute(j, status[j]);
                }
            }
        } else { // 插入关键点
            if (flag) {
                $previeDrawbg.find('[data-id="' + id + '"]').remove();
            } else {
                if ($previeDrawbg.find('[data-id="' + id + '"]').length > 0) {
                    cloneNode = $previeDrawbg.find('[data-id="' + id + '"]').eq(0);
                } else {
                    cloneNode = $(ele).clone();
                    cloneNode.find('span').remove();
                    $previeDrawbg.append(cloneNode);
                }

                this.links[id] = $.extend(this.links[id] || {}, {
                    x: ($(ele).position().left + this.circlePointSize / 2) / this.startSize.w / this.times,
                    y: ($(ele).position().top + this.circlePointSize / 2) / this.startSize.h / this.times
                });

                cloneNode.css({
                    'left': this.startSize.w * this.links[id].x - this.circlePointSize / 2,
                    'top': this.startSize.h * this.links[id].y - this.circlePointSize / 2
                })
            }
        }
    }
}
