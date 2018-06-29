var batchMark = function(layer, form) {
    this.defaultWidth = 220; // 九宫格resizehandler尺寸
    this.viewFlag = false;
    this.isBatch = true;
    this.MAX_FAILEDPERCENT = 0.4; // 允许任务最大失败比例
    this.layer = layer;
    this.form = form;
    this.errorList = [];
    this.sendBackList = [];
    this.giveUpList = [];
    this.eventsDom = $('#ulFlag');
    this.checkErrorItem = false;
    this.checking = false;
    this.init = function() {
        var self = this;
        document.querySelector('input[lay-filter="isBatch"]') && document.querySelector('input[lay-filter="isBatch"]').setAttribute('autocomplete', 'off');
        document.querySelector('input[lay-filter="selectAll"]') && document.querySelector('input[lay-filter="selectAll"]').setAttribute('autocomplete', 'off');
        document.querySelector('input[lay-filter="viewFlag"]') && document.querySelector('input[lay-filter="viewFlag"]').setAttribute('autocomplete', 'off');
        this.load_init().then(function(config) {
            self.projectBegining(config);
        }).fail(function() {
            self.layer.alert('任务初始化失败');
        })
    }
}

batchMark.prototype = {
    load_init: function() {
        var dtd = $.Deferred();
        this.checking = document.body.hasAttribute('data-check') ? true: false;
        $.when(this.loadLabelConfig(), this.loadLabelData()).done(function (config, labelData) {
            dtd.resolve({
                config: config,
                labelData: labelData.tasks,
                parent: labelData.label.code,
                tag: labelData.attribute.code
            });
        }).fail(function () {
            dtd.reject();
        })

        return dtd.promise();
    },
    projectBegining: function(dataJson) {
        try {
            var task = getJsonByKey(dataJson.config, 'code', dataJson.parent),
                tagInfo = getJsonByKey(task.attributes, 'code', dataJson.tag),
                valueList = {},
                keyList,
                itemsContainer = this.eventsDom,
                self = this;

            !this.checking && $('#sendBackHandler').hide();

            for (var key in dataJson.labelData) {
                valueList[key] = JSON.parse(dataJson.labelData[key])
            }
            keyList = Object.keys(valueList);
        } catch (e) {
            return this.layer.alert('获取任务类型失败');
        }

        if (keyList.length === 0){
            var backToListUrl;
            if (this.checking) {
                backToListUrl = '/admin/task/label/review/view/backlog/statistics';
            } else {
                backToListUrl = '/admin/task/label/label/view/backlog/statistics';
            }
            window.location.href = backToListUrl;
            return;
        }

        if (tagInfo.supportFramed ||  tagInfo.type !== 'SINGLE_CHOICE' || !tagInfo.optionalValues || tagInfo.optionalValues.length === 0) {
            return this.layer.alert('导入任务类型错误，请联系管理员');
        }

        var optionList = (function(optionalValues) {
            return optionalValues.map(function(option) {
                return '<input type="radio" name="' + tagInfo.code + '" value="' + option.value + '" title="' + option.value + '" ' + (self.checking ? 'disabled="true"' : '') + ' lay-filter="choice">'
            })
        }(tagInfo.optionalValues))
        $('#multiOption_wrapper').append(optionList.join(''));
        $.when.apply($, keyList.map(function(k) {
            return self.imageLoadAsync(itemsContainer, k, valueList[k].req_info, tagInfo, k);
        })).then(function() {
            var successList = [],
                failedList = [];
            Array.prototype.forEach.call(arguments, function(arg, i) {
                if (arg.status === 'success' && !valueList[arg.key].req_info.delete) {
                    successList.push(arg.key);
                } else {
                    failedList.push(arg.key);
                }
            })

            if (failedList.length / (failedList.length + successList.length) > self.MAX_FAILEDPERCENT) {
                self.layer.confirm('目前大量任务加载失败，可能是由于您当前的网络存在波动或其他外部原因，请重新加载', {icon: 5, title:'提示'}, function(index){
                    if (index) {
                        window.location.reload();
                    } else {
                        self.layer.close();
                    }
                });
            }
            $('#taskNum').text(failedList.length + successList.length);
            $('#failTaskNum').text(failedList.length);
            $('#failTaskPercent').text((failedList.length / (failedList.length + successList.length) * 100).toFixed(2) + '%');
            // 获取已选分类

            var tempArr = self.getLabelTypeBtn(successList, valueList, tagInfo.code, 1, tagInfo.optionalValues.length);
            self.bindPreviewEvents(); // 绑定图片预览
            self.batchSetVal(valueList, tagInfo.code); // 绑定左上批量修改值
            self.bindDataChanged(valueList, tagInfo.code, tempArr); // 绑定表单操作事件
            self.bindChangeLabelType(); // 绑定分类查看
            self.bindSelectItem();
            self.bindSubmitEvents(valueList, failedList); // 绑定数据提交
            self.eventsListener(successList, valueList, tagInfo.code, tagInfo.optionalValues.length); // 注册事件监听
            self.bindUserActionRemove();
            self.form.render();
            $('.tagName').text(tagInfo.name);
            $('#loading').hide();
            $(document.body).css('overflow', 'auto');

        })
    },
    loadLabelConfig: function() {
        var dtd = $.Deferred();
        // $.ajax({
        //     url: '/common/label/data',
        //     type: 'get',
        //     dataType: 'json',
        //     async: false,
        //     success: function(data) {

        //         dtd.resolve(data.data);
        //     },
        //     error: function() {
        //         dtd.reject('配置数据加载失败');
        //     }
        // })

        var a = {"code":200,"errorCode":null,"errorMessage":null,"data":[{"id":1,"createDate":1521857099000,"lastUpdateDate":1521945151000,"uuid":"27b070003c0547d5bcc9a02da1f96c1e","name":"画布属性","code":"canvas","displayMode":"default","attributes":[{"id":1,"createDate":1521857180000,"lastUpdateDate":1527479631000,"uuid":"b2a973a493d142c18823ed23c26916d4","name":"主体类型","code":"body_type","type":"SINGLE_CHOICE","priority":"YELLOW","supportBatchOperations":true,"supportFramed":false,"optionalValues":[{"id":1,"createDate":1521857180000,"lastUpdateDate":1521857180000,"uuid":"d42635a0f6994be5b7443e50d49d8753","value":"模特图","defaultChecked":false,"removed":false},{"id":2,"createDate":1521857180000,"lastUpdateDate":1521857180000,"uuid":"658fd4f11ee24062aa887028ceb05f04","value":"静物图","defaultChecked":false,"removed":false},{"id":3,"createDate":1521857180000,"lastUpdateDate":1521857180000,"uuid":"c81e6ff3ba07473890e827ad84809049","value":"细节图","defaultChecked":false,"removed":false},{"id":4,"createDate":1521857180000,"lastUpdateDate":1521857180000,"uuid":"5984a3b1b4ab4be6941a006f68989c66","value":"洗唛图","defaultChecked":false,"removed":false},{"id":5,"createDate":1521857180000,"lastUpdateDate":1521857180000,"uuid":"815bc14aa826467cb8bf3f6bf2a38c6d","value":"吊牌图","defaultChecked":false,"removed":false},{"id":6,"createDate":1521857180000,"lastUpdateDate":1521857180000,"uuid":"fe3abf022237413aa02769afabed9c87","value":"面料图","defaultChecked":false,"removed":false},{"id":7,"createDate":1521857180000,"lastUpdateDate":1521857180000,"uuid":"bf10851851e04578bcf52c753c8acd40","value":"组合图","defaultChecked":false,"removed":false},{"id":156,"createDate":1527479631000,"lastUpdateDate":1527479631000,"uuid":"ac44f1ecd949433cb4aa16b92d7db023","value":"模特细节","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":2,"createDate":1521857240000,"lastUpdateDate":1521857240000,"uuid":"a467142db91b44318603905153a74b2d","name":"画面风格","code":"picture_type","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":true,"supportFramed":false,"optionalValues":[{"id":8,"createDate":1521857240000,"lastUpdateDate":1521857240000,"uuid":"011c53566aa1426d9211a96ffb5ee593","value":"室内纯色背景","defaultChecked":false,"removed":false},{"id":9,"createDate":1521857240000,"lastUpdateDate":1521857240000,"uuid":"0935419117e549af9a770a8cd6b97d9e","value":"室内实景","defaultChecked":false,"removed":false},{"id":10,"createDate":1521857240000,"lastUpdateDate":1521857240000,"uuid":"6bfae66892544bb494d27a493a956be8","value":"外景","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null}],"parent":null,"parentAttribute":null},{"id":2,"createDate":1521857398000,"lastUpdateDate":1527667152000,"uuid":"102d8baf79ed4ccab48f031704855dc6","name":"主体位置","code":"main_body","displayMode":"pop-up","attributes":[{"id":3,"createDate":1521857472000,"lastUpdateDate":1524195356000,"uuid":"7ffc246d83a14c4c8ce6430d26f31b00","name":"模特位置","code":"model_location","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":false,"supportFramed":false,"optionalValues":[{"id":11,"createDate":1521857473000,"lastUpdateDate":1521857473000,"uuid":"740fb0aa2f164bd38011287fb76491df","value":"人体九宫格","defaultChecked":false,"removed":false},{"id":12,"createDate":1521857473000,"lastUpdateDate":1521857473000,"uuid":"fb9a7e037b6e408fbf7363c258aee5fc","value":"服装九宫格","defaultChecked":false,"removed":false},{"id":13,"createDate":1521857473000,"lastUpdateDate":1521857473000,"uuid":"680a1056c0d245fe8863383ed9a578c6","value":"人脸九宫格","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":4,"createDate":1521857534000,"lastUpdateDate":1521857534000,"uuid":"44f3ab21bb2549c7b9fe67aed71b1cde","name":"静物位置","code":"still_life_location","type":"TEXT","priority":"GREEN","supportBatchOperations":false,"supportFramed":false,"optionalValues":[],"active":true,"parent":null,"parentOptionalValue":null},{"id":5,"createDate":1521857560000,"lastUpdateDate":1521857560000,"uuid":"792d8234df754cd4b2efbe03d3092cbb","name":"洗唛吊牌位置","code":"wash_tags_location","type":"TEXT","priority":"GREEN","supportBatchOperations":false,"supportFramed":false,"optionalValues":[],"active":true,"parent":null,"parentOptionalValue":null},{"id":23,"createDate":1527664037000,"lastUpdateDate":1527910731000,"uuid":"3fcfb747c5e9479fbbc2c4b6d1097b00","name":"鞋子位置","code":"shoes_location","type":"SINGLE_CHOICE","priority":"YELLOW","supportBatchOperations":false,"supportFramed":true,"optionalValues":[{"id":157,"createDate":1527667828000,"lastUpdateDate":1527667828000,"uuid":"d6f8878992ed4473b8357eb620d38856","value":"1","defaultChecked":true,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null}],"parent":{"id":1,"createDate":1521857099000,"lastUpdateDate":1521945151000,"uuid":"27b070003c0547d5bcc9a02da1f96c1e","name":"画布属性","code":"canvas","displayMode":"default","attributes":[],"parent":null,"parentAttribute":null},"parentAttribute":null},{"id":3,"createDate":1521857650000,"lastUpdateDate":1522291611000,"uuid":"c84713a58d96448cac9f5f4d0d7bfb40","name":"人体属性","code":"body","displayMode":"default","attributes":[{"id":6,"createDate":1521857762000,"lastUpdateDate":1524205507000,"uuid":"267ddbed693547958f7b37f602c07fa6","name":"人体朝向","code":"body_orientation","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":true,"supportFramed":false,"optionalValues":[{"id":150,"createDate":1524195870000,"lastUpdateDate":1524195870000,"uuid":"3a1eacebf366477fa9be2c6a9dd9760a","value":"正面朝左","defaultChecked":false,"removed":false},{"id":151,"createDate":1524195870000,"lastUpdateDate":1524195870000,"uuid":"a1591f27be0447319be19b6dc45b36da","value":"正面朝右","defaultChecked":false,"removed":false},{"id":152,"createDate":1524195870000,"lastUpdateDate":1524195870000,"uuid":"bd23d9aec3e1485486d89f0e7972a14e","value":"正面居中","defaultChecked":false,"removed":false},{"id":153,"createDate":1524195870000,"lastUpdateDate":1524195870000,"uuid":"164a889ab1054b2bb60e8ed36caa3c14","value":"背面朝左","defaultChecked":false,"removed":false},{"id":154,"createDate":1524195870000,"lastUpdateDate":1524195870000,"uuid":"fdf93e0d6e424d80ab50a5ddabf59c61","value":"背面朝右","defaultChecked":false,"removed":false},{"id":155,"createDate":1524195870000,"lastUpdateDate":1524195870000,"uuid":"501ad42bc9e94fb0b6548d25aca877b1","value":"背面居中","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":7,"createDate":1521857827000,"lastUpdateDate":1521857827000,"uuid":"bbaf8e64ed9f43a6b52f22d86df38518","name":"人体位置","code":"body_part","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":true,"supportFramed":false,"optionalValues":[{"id":20,"createDate":1521857827000,"lastUpdateDate":1521857827000,"uuid":"956bdc87cb7a45b7a43f376d4c5a76f1","value":"上半身","defaultChecked":false,"removed":false},{"id":21,"createDate":1521857827000,"lastUpdateDate":1521857827000,"uuid":"8b016d968d7d49d097ae33b3feb2943c","value":"下半身","defaultChecked":false,"removed":false},{"id":22,"createDate":1521857827000,"lastUpdateDate":1521857827000,"uuid":"bf2aa000b98e442795c41a9d1e0fc620","value":"全身","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":8,"createDate":1521857882000,"lastUpdateDate":1521945155000,"uuid":"f8869f0aa2a04266bbf868ca349bb2cf","name":"人脸朝向","code":"face_orientation","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":true,"supportFramed":false,"optionalValues":[{"id":23,"createDate":1521857882000,"lastUpdateDate":1521857882000,"uuid":"310df314b48145f291163add4282e671","value":"朝左","defaultChecked":false,"removed":false},{"id":24,"createDate":1521857882000,"lastUpdateDate":1521857882000,"uuid":"b1d57dbfeff04562b4bd5df3a062eaea","value":"朝右","defaultChecked":false,"removed":false},{"id":25,"createDate":1521857882000,"lastUpdateDate":1521857882000,"uuid":"c6130a0bd965421985284ec9d6613a1f","value":"居中","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null}],"parent":{"id":1,"createDate":1521857099000,"lastUpdateDate":1521945151000,"uuid":"27b070003c0547d5bcc9a02da1f96c1e","name":"画布属性","code":"canvas","displayMode":"default","attributes":[],"parent":null,"parentAttribute":null},"parentAttribute":null},{"id":4,"createDate":1521857915000,"lastUpdateDate":1521857965000,"uuid":"052d1194c50e439e99e7053f27e24140","name":"服装静物属性","code":"cloth_still_life","displayMode":"pop-up","attributes":[{"id":9,"createDate":1521858113000,"lastUpdateDate":1521858113000,"uuid":"638aa0c0751249aeba99666c7c5d455e","name":"静物朝向","code":"still_life_orientation","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":true,"supportFramed":false,"optionalValues":[{"id":26,"createDate":1521858113000,"lastUpdateDate":1521858113000,"uuid":"cc67d70983024836be9de018cd5f6280","value":"正面朝左","defaultChecked":false,"removed":false},{"id":27,"createDate":1521858113000,"lastUpdateDate":1521858113000,"uuid":"c96426d16a864e468e177f394842d7b1","value":"正面朝右","defaultChecked":false,"removed":false},{"id":28,"createDate":1521858113000,"lastUpdateDate":1521858113000,"uuid":"d5616f7f2bc2417ead990f4cd537a9cb","value":"正面居中","defaultChecked":false,"removed":false},{"id":29,"createDate":1521858113000,"lastUpdateDate":1521858113000,"uuid":"fe420199d0d64308a8e62550ada0b37f","value":"背面朝左","defaultChecked":false,"removed":false},{"id":30,"createDate":1521858113000,"lastUpdateDate":1521858113000,"uuid":"c91327a973b4421b956db5018e331be1","value":"背面朝右","defaultChecked":false,"removed":false},{"id":31,"createDate":1521858113000,"lastUpdateDate":1521858113000,"uuid":"6cf141e673e04fe98c7210c0fe56ce7b","value":"背面居中","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":10,"createDate":1521858186000,"lastUpdateDate":1521858186000,"uuid":"b77b7ec84b484218a588b74329b38050","name":"摆放方式","code":"cloth_display","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":true,"supportFramed":false,"optionalValues":[{"id":32,"createDate":1521858186000,"lastUpdateDate":1521858186000,"uuid":"757fe308f8824d66880ed7a1e1c9a647","value":"常规","defaultChecked":false,"removed":false},{"id":33,"createDate":1521858186000,"lastUpdateDate":1521858186000,"uuid":"e390925402ce44c18ff83e69c69bc64e","value":"带衣架","defaultChecked":false,"removed":false},{"id":34,"createDate":1521858186000,"lastUpdateDate":1521858186000,"uuid":"9e336e526d6d460d8dac5c0f8dfd06f9","value":"假模","defaultChecked":false,"removed":false},{"id":35,"createDate":1521858186000,"lastUpdateDate":1521858186000,"uuid":"3a8a890ff38143698fe349269cc64da8","value":"摊开/敞开","defaultChecked":false,"removed":false},{"id":36,"createDate":1521858186000,"lastUpdateDate":1521858186000,"uuid":"95fdb181cc9948d2875e7e814fdb8c1e","value":"折叠","defaultChecked":false,"removed":false},{"id":37,"createDate":1521858186000,"lastUpdateDate":1521858186000,"uuid":"8e09b9803bc341409049bada5594182a","value":"内搭/内胆","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null}],"parent":{"id":1,"createDate":1521857099000,"lastUpdateDate":1521945151000,"uuid":"27b070003c0547d5bcc9a02da1f96c1e","name":"画布属性","code":"canvas","displayMode":"default","attributes":[],"parent":null,"parentAttribute":null},"parentAttribute":null},{"id":5,"createDate":1521858298000,"lastUpdateDate":1521859980000,"uuid":"c9c0bd54c379412b8b501bb84bb96e64","name":"产品属性","code":"product","displayMode":"pop-up","attributes":[{"id":11,"createDate":1521858392000,"lastUpdateDate":1521860796000,"uuid":"5b6146c574014bdf8bf264a785ca855d","name":"适用季节","code":"suit_season","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":true,"supportFramed":false,"optionalValues":[{"id":147,"createDate":1521860796000,"lastUpdateDate":1521860796000,"uuid":"a39b0900304a4396be3a43815db58494","value":"春秋","defaultChecked":false,"removed":false},{"id":148,"createDate":1521860796000,"lastUpdateDate":1521860796000,"uuid":"f9e065c83b424127b124cee9b16e4f46","value":"夏季","defaultChecked":false,"removed":false},{"id":149,"createDate":1521860796000,"lastUpdateDate":1521860796000,"uuid":"74c6899f7f0a4cc7948c8f2e9d2d6ae8","value":"冬季","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":12,"createDate":1521858488000,"lastUpdateDate":1521858488000,"uuid":"c227e9b1436f400c8a8c5635fb653f3c","name":"适用性别","code":"suit_sex","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":true,"supportFramed":false,"optionalValues":[{"id":38,"createDate":1521858488000,"lastUpdateDate":1521858488000,"uuid":"066e4a3453ec4b30979bccf8796f45a8","value":"成年男性","defaultChecked":false,"removed":false},{"id":39,"createDate":1521858488000,"lastUpdateDate":1521858488000,"uuid":"345cd84d4f2e440d991a108940b18104","value":"成年女性","defaultChecked":false,"removed":false},{"id":40,"createDate":1521858488000,"lastUpdateDate":1521858488000,"uuid":"bbb5c720e1874d0096b63111448ab57d","value":"成年中性","defaultChecked":false,"removed":false},{"id":41,"createDate":1521858488000,"lastUpdateDate":1521858488000,"uuid":"248826bd734c453f870a024f13bc8ef4","value":"女童","defaultChecked":false,"removed":false},{"id":42,"createDate":1521858488000,"lastUpdateDate":1521858488000,"uuid":"f9c5b3d7498d4941b944b9a1abcc6b11","value":"男童","defaultChecked":false,"removed":false},{"id":43,"createDate":1521858488000,"lastUpdateDate":1521858488000,"uuid":"c8c7c4e3220e4705808d6bff6a1f0999","value":"儿童中性","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":13,"createDate":1521858636000,"lastUpdateDate":1521858636000,"uuid":"9b64847f952749e5b06a9296252416cb","name":"适用年龄","code":"suit_age","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":true,"supportFramed":false,"optionalValues":[{"id":44,"createDate":1521858636000,"lastUpdateDate":1521858636000,"uuid":"c9969d3840ad4f3eb98872de2c530471","value":"婴童（0-1）","defaultChecked":false,"removed":false},{"id":45,"createDate":1521858636000,"lastUpdateDate":1521858636000,"uuid":"2cc539cb07844752a73dbdc647b2a9ca","value":"幼童（1-3）","defaultChecked":false,"removed":false},{"id":46,"createDate":1521858636000,"lastUpdateDate":1521858636000,"uuid":"ef70eefd993a4736aaa5d385cafcbdb0","value":"小童（3-6）","defaultChecked":false,"removed":false},{"id":47,"createDate":1521858636000,"lastUpdateDate":1521858636000,"uuid":"cd3aa5d047aa43c2afbd05023af65c65","value":"中童（6-9）","defaultChecked":false,"removed":false},{"id":48,"createDate":1521858636000,"lastUpdateDate":1521858636000,"uuid":"3f862863b5694ffca7087bb1f2869552","value":"大童（9-12）","defaultChecked":false,"removed":false},{"id":49,"createDate":1521858636000,"lastUpdateDate":1521858636000,"uuid":"d08a1a126b8745d3b859a89cae6f6b8d","value":"少年（13-17）","defaultChecked":false,"removed":false},{"id":50,"createDate":1521858636000,"lastUpdateDate":1521858636000,"uuid":"7bfa15b79e8045bdbd41e407a20b73fa","value":"青年（18-34）","defaultChecked":false,"removed":false},{"id":51,"createDate":1521858636000,"lastUpdateDate":1521858636000,"uuid":"158ed0339ed04218844fa9d1e21cb24e","value":"中年（35-49）","defaultChecked":false,"removed":false},{"id":52,"createDate":1521858636000,"lastUpdateDate":1521858636000,"uuid":"747d41dd21944c168362664e7d2acf6e","value":"中老年（60-64）","defaultChecked":false,"removed":false},{"id":53,"createDate":1521858636000,"lastUpdateDate":1521858636000,"uuid":"9641abd5e8534acbb63bf236d550d302","value":"老年（65+）","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":14,"createDate":1521858676000,"lastUpdateDate":1521858676000,"uuid":"8c0f4d0ba3f14f04974d6d94ca4dfaee","name":"产品类目","code":"category","type":"TEXT","priority":"GREEN","supportBatchOperations":false,"supportFramed":false,"optionalValues":[],"active":true,"parent":null,"parentOptionalValue":null},{"id":15,"createDate":1521858904000,"lastUpdateDate":1521858925000,"uuid":"921e8cb8237d4409a2df457e7ee8a2d8","name":"款式廓形","code":"profile_style","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":false,"supportFramed":false,"optionalValues":[{"id":54,"createDate":1521858904000,"lastUpdateDate":1521858904000,"uuid":"70fac1a655d948da81d73e7f76ad1354","value":"H型","defaultChecked":false,"removed":false},{"id":55,"createDate":1521858904000,"lastUpdateDate":1521858904000,"uuid":"640644204c6345489ca7bc7112d47be6","value":"X型","defaultChecked":false,"removed":false},{"id":56,"createDate":1521858904000,"lastUpdateDate":1521858904000,"uuid":"592e8dfa22f142e5a60261cf1a309aa7","value":"A型","defaultChecked":false,"removed":false},{"id":57,"createDate":1521858904000,"lastUpdateDate":1521858904000,"uuid":"d70de14d90b543d1b0d1c88b428e2fa8","value":"V型","defaultChecked":false,"removed":false},{"id":58,"createDate":1521858904000,"lastUpdateDate":1521858904000,"uuid":"daf64636463b41f5be4c8367f077b6fe","value":"O型","defaultChecked":false,"removed":false},{"id":59,"createDate":1521858904000,"lastUpdateDate":1521858904000,"uuid":"1e9a0bb72aa54b99b146fdbfac0d9f5d","value":"T型","defaultChecked":false,"removed":false},{"id":60,"createDate":1521858904000,"lastUpdateDate":1521858904000,"uuid":"13af8dc28a004e23b4117602878f6b29","value":"Y型","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":16,"createDate":1521858984000,"lastUpdateDate":1521858984000,"uuid":"e8d8f2a4918e48b596dfdfa0cac0c130","name":"主面料","code":"main_fabric","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":false,"supportFramed":false,"optionalValues":[{"id":61,"createDate":1521858984000,"lastUpdateDate":1521858984000,"uuid":"81334b298693434e8db1041b28a2e09f","value":"棉","defaultChecked":false,"removed":false},{"id":62,"createDate":1521858984000,"lastUpdateDate":1521858984000,"uuid":"eefea2e775b5434aa500b84deed912db","value":"麻","defaultChecked":false,"removed":false},{"id":63,"createDate":1521858984000,"lastUpdateDate":1521858984000,"uuid":"3e50bbeee597479d922a290ad914e378","value":"丝绸","defaultChecked":false,"removed":false},{"id":64,"createDate":1521858984000,"lastUpdateDate":1521858984000,"uuid":"d2898e9569484b49a21db5ca6cfac298","value":"毛料","defaultChecked":false,"removed":false},{"id":65,"createDate":1521858984000,"lastUpdateDate":1521858984000,"uuid":"bbedd4dae3ef478fbd83af0c81dc19e2","value":"皮革","defaultChecked":false,"removed":false},{"id":66,"createDate":1521858984000,"lastUpdateDate":1521858984000,"uuid":"1e1f6c5ed6d74e13a7a4a1adb740b970","value":"化纤","defaultChecked":false,"removed":false},{"id":67,"createDate":1521858984000,"lastUpdateDate":1521858984000,"uuid":"6c87bf9747ff4a62bb816b6005822483","value":"混纺","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":17,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"ea011a8e6fce4055b6350bdd652796fc","name":"色彩花纹","code":"color_figure","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":false,"supportFramed":false,"optionalValues":[{"id":68,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"44bd781067c54102a8b06362190f9396","value":"红","defaultChecked":false,"removed":false},{"id":69,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"614fdec08f6d4f9782298a266fb9625b","value":"绿","defaultChecked":false,"removed":false},{"id":70,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"680c34e66d0a4a728d3780097dd0d5e1","value":"橙","defaultChecked":false,"removed":false},{"id":71,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"39c646a1f76a48ff966bc43c37355083","value":"黄","defaultChecked":false,"removed":false},{"id":72,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"870169a3f5a949bbacf5f53d65a114a9","value":"紫","defaultChecked":false,"removed":false},{"id":73,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"f4573fa4f2f24018b35a87288e725d96","value":"蓝","defaultChecked":false,"removed":false},{"id":74,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"819fb19c7b28493ebf523ee7a3067f43","value":"棕","defaultChecked":false,"removed":false},{"id":75,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"10da132490e048a2a5743e149ae12fc0","value":"黑","defaultChecked":false,"removed":false},{"id":76,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"2e4a58c925e74cc39d4957ab8f0886c2","value":"白","defaultChecked":false,"removed":false},{"id":77,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"173f5867112b4d5987dbf61525c5bb4c","value":"灰","defaultChecked":false,"removed":false},{"id":78,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"0b7677aab13b441290d108c3d6101eb8","value":"撞色拼接","defaultChecked":false,"removed":false},{"id":79,"createDate":1521859121000,"lastUpdateDate":1521859121000,"uuid":"9bbb348bb0da4af995d69220e521204d","value":"图案花纹","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":18,"createDate":1521859334000,"lastUpdateDate":1524549082000,"uuid":"821d65e7edf847b7b679512ec90441aa","name":"产品风格","code":"product_style","type":"MULTI_CHOICE","priority":"GREEN","supportBatchOperations":false,"supportFramed":false,"optionalValues":[{"id":80,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"2c74c7b3d3344a83a8a6c31eb9487d8f","value":"甜美","defaultChecked":false,"removed":false},{"id":81,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"89061d2155994be085037496a6c2cecf","value":"淑女","defaultChecked":false,"removed":false},{"id":82,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"5fa318d520424b129b4b310a1b3865e9","value":"瑞丽","defaultChecked":false,"removed":false},{"id":83,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"a9f0ad742efa48848e41248eebc00c35","value":"名媛","defaultChecked":false,"removed":false},{"id":84,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"fe8d574caa034bdc903ea0a477ce5dbd","value":"清新","defaultChecked":false,"removed":false},{"id":85,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"47e7fc7af1ac4c058b18edd9dae564c8","value":"田园","defaultChecked":false,"removed":false},{"id":86,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"352fb5a81c454140bd96d828e767287c","value":"休闲","defaultChecked":false,"removed":false},{"id":87,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"8a495badd03f4351bfd74cb87d2f60ce","value":"运动","defaultChecked":false,"removed":false},{"id":88,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"0d578e190145437493057a6ac2da6155","value":"中性","defaultChecked":false,"removed":false},{"id":89,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"fc4b716cc27d4d76af9111e79cfb8179","value":"通勤","defaultChecked":false,"removed":false},{"id":90,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"604c12fdb34340c28428d31daa0a7886","value":"OL","defaultChecked":false,"removed":false},{"id":91,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"74f40e1f895f4e86907e5d3a97ffadd6","value":"韩版","defaultChecked":false,"removed":false},{"id":92,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"ea1b95c01b35477f934437d3b6de0795","value":"简约","defaultChecked":false,"removed":false},{"id":93,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"03ea56cff6ac438788f091b4f7b0732a","value":"森系","defaultChecked":false,"removed":false},{"id":94,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"fa3cd3b3e0c044e8a63b709e174f2ac7","value":"日风","defaultChecked":false,"removed":false},{"id":95,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"a20e6befd9a6443688286d40cb05c098","value":"百搭","defaultChecked":false,"removed":false},{"id":96,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"621ae69b42d24c91b40a186230e4dfc7","value":"欧美","defaultChecked":false,"removed":false},{"id":97,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"d61a5303b9694f44a4ff44d9e3c05ffd","value":"街头","defaultChecked":false,"removed":false},{"id":98,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"de52e41427a54bafa939287922fbf318","value":"嘻哈","defaultChecked":false,"removed":false},{"id":99,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"6d452ce544174b4c8ae09d2f8f3937fa","value":"朋克","defaultChecked":false,"removed":false},{"id":100,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"4c9065e4ed3f4db0b514a6d4b6bfb42c","value":"学院","defaultChecked":false,"removed":false},{"id":101,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"66c951b934a54e4f9e073210630f589e","value":"英伦","defaultChecked":false,"removed":false},{"id":102,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"bd18e8e22ae34391bbc9a9d4d63c7e4b","value":"民族","defaultChecked":false,"removed":false},{"id":103,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"a20dec33aeeb4703a0bb4605264a6771","value":"复古","defaultChecked":false,"removed":false},{"id":104,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"0a73bfcd6c944c37aa452e4de495cd7b","value":"波西米亚","defaultChecked":false,"removed":false},{"id":105,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"6b970e757750430eb46a7646a4be0133","value":"洛丽塔","defaultChecked":false,"removed":false},{"id":106,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"d863c5ae5aca4da3b0fca866fca38d20","value":"哥特","defaultChecked":false,"removed":false},{"id":107,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"4b57c32090ea48b3b14760e65b1d6aa2","value":"巴洛克","defaultChecked":false,"removed":false},{"id":108,"createDate":1521859334000,"lastUpdateDate":1521859334000,"uuid":"85a7a36578c849a0b764142a327135b0","value":"嬉皮","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":19,"createDate":1521859435000,"lastUpdateDate":1521859435000,"uuid":"b21975cb689b4ca5a125caf911791ebd","name":"产品颜色","code":"product_color","type":"TEXT","priority":"GREEN","supportBatchOperations":true,"supportFramed":false,"optionalValues":[],"active":true,"parent":null,"parentOptionalValue":null}],"parent":{"id":2,"createDate":1521857398000,"lastUpdateDate":1527667152000,"uuid":"102d8baf79ed4ccab48f031704855dc6","name":"主体位置","code":"main_body","displayMode":"pop-up","attributes":[],"parent":null,"parentAttribute":null},"parentAttribute":{"id":3,"createDate":1521857472000,"lastUpdateDate":1524195356000,"uuid":"7ffc246d83a14c4c8ce6430d26f31b00","name":"模特位置","code":"model_location","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":false,"supportFramed":false,"optionalValues":[],"active":true,"parent":null,"parentOptionalValue":null}},{"id":6,"createDate":1521859507000,"lastUpdateDate":1521859507000,"uuid":"031e6fb912184a14a9118e33734a913c","name":"产品局部属性","code":"product_part","displayMode":"pop-up","attributes":[{"id":20,"createDate":1521859635000,"lastUpdateDate":1525516806000,"uuid":"570bd564ae964b17b92b409d8c2e4ba5","name":"图案花纹","code":"pattern_figure","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":true,"supportFramed":false,"optionalValues":[{"id":109,"createDate":1521859635000,"lastUpdateDate":1521859635000,"uuid":"e6871998e8bd441486b093b88dd854e3","value":"几何图形","defaultChecked":false,"removed":false},{"id":110,"createDate":1521859635000,"lastUpdateDate":1521859635000,"uuid":"7638f404f93445f984129659096fa28b","value":"运动","defaultChecked":false,"removed":false},{"id":111,"createDate":1521859635000,"lastUpdateDate":1521859635000,"uuid":"c9f42dae71e04fc585bab9b279b0a0f3","value":"人物","defaultChecked":false,"removed":false},{"id":112,"createDate":1521859635000,"lastUpdateDate":1521859635000,"uuid":"c379b816f18e4ac0825754c225b7c432","value":"太空科技","defaultChecked":false,"removed":false},{"id":113,"createDate":1521859635000,"lastUpdateDate":1521859635000,"uuid":"4acd3af240d84f90888d7ebf22842030","value":"人体结构","defaultChecked":false,"removed":false},{"id":114,"createDate":1521859635000,"lastUpdateDate":1521859635000,"uuid":"7382f5fd0e36431b9fa50f943d5bca8b","value":"生活","defaultChecked":false,"removed":false},{"id":115,"createDate":1521859635000,"lastUpdateDate":1521859635000,"uuid":"e0248a7c9cb7423aac7865598eba1b35","value":"海洋","defaultChecked":false,"removed":false},{"id":116,"createDate":1521859635000,"lastUpdateDate":1521859635000,"uuid":"c9fd3399a0574845956b6f057c183f58","value":"自然风景","defaultChecked":false,"removed":false},{"id":117,"createDate":1521859635000,"lastUpdateDate":1521859635000,"uuid":"2a0a7e2a71a24400afedd50248b84edc","value":"艺术效果","defaultChecked":false,"removed":false},{"id":118,"createDate":1521859635000,"lastUpdateDate":1521859635000,"uuid":"02de2ffbed4046319249c9b3fc4ef24c","value":"卡通动漫","defaultChecked":false,"removed":false},{"id":119,"createDate":1521859635000,"lastUpdateDate":1521859635000,"uuid":"ba8d553fd2ed46109f33d90d5f84b39f","value":"其他","defaultChecked":false,"removed":false},{"id":120,"createDate":1521859635000,"lastUpdateDate":1521859635000,"uuid":"e7e0a13d26854de8adae43b72f5c853f","value":"无图案","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":21,"createDate":1521859774000,"lastUpdateDate":1524125657000,"uuid":"81496ceb71cd4045b3fa2e1b490b6249","name":"视觉工艺","code":"visual_craft","type":"MULTI_CHOICE","priority":"GREEN","supportBatchOperations":false,"supportFramed":true,"optionalValues":[{"id":121,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"5e2afd63175a4129aaf2d0127ddbea57","value":"绣花","defaultChecked":false,"removed":false},{"id":122,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"6fe68a1fcb8048c48c73db67bb821a23","value":"印花","defaultChecked":false,"removed":false},{"id":123,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"74e8cc25fa1b4ce2b5a193ff68ad5ed6","value":"烫钻","defaultChecked":false,"removed":false},{"id":124,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"d7014c4fbda049daac98f03daaa7c1c9","value":"贴布/贴片","defaultChecked":false,"removed":false},{"id":125,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"7c9ddc27bdba4bedb628ab5b51ce2892","value":"徽章标记","defaultChecked":false,"removed":false},{"id":126,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"0e3298e381c54fed97549211d47cfe14","value":"亮片","defaultChecked":false,"removed":false},{"id":127,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"8d5ccfa13e5a488f9a8e8eb48c1beef0","value":"流苏","defaultChecked":false,"removed":false},{"id":128,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"e1b6ca438f0e41b0b3c84e6793767155","value":"钉珠","defaultChecked":false,"removed":false},{"id":129,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"f629fae161df4a03b81e704a3a95d019","value":"破洞","defaultChecked":false,"removed":false},{"id":130,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"82494c7a70f540b38007184489834a0c","value":"蕾丝","defaultChecked":false,"removed":false},{"id":131,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"8d521733f720476b85881567dadfbbbd","value":"蝴蝶结","defaultChecked":false,"removed":false},{"id":132,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"fdc8262e98994179ab2bdc3a5de28dde","value":"腰带","defaultChecked":false,"removed":false},{"id":133,"createDate":1521859774000,"lastUpdateDate":1521859774000,"uuid":"f6bf391ee8cc426c9df0dd40411f3dd1","value":"无装饰","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null},{"id":22,"createDate":1521859886000,"lastUpdateDate":1524722977000,"uuid":"aeadac5f3d40489d850e6a341fd6c5d2","name":"产品细节","code":"product_detail","type":"SINGLE_CHOICE","priority":"GREEN","supportBatchOperations":true,"supportFramed":true,"optionalValues":[{"id":134,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"ce996b27451342788b213ecc96b37dcf","value":"领口","defaultChecked":false,"removed":false},{"id":135,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"93d34c55a285409d9f5ecd20e6e9cf80","value":"肩膀","defaultChecked":false,"removed":false},{"id":136,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"d5c4d7c33d094c3196e21baa5d3afddf","value":"袖口","defaultChecked":false,"removed":false},{"id":137,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"39d63d7f23234d9a95467938b7502d67","value":"口袋","defaultChecked":false,"removed":false},{"id":138,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"f9489729010f46bdaa3c891950bf1521","value":"拉链门襟","defaultChecked":false,"removed":false},{"id":139,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"0d73e2c156e44aa5b7c6633f1bf6ee11","value":"帽子","defaultChecked":false,"removed":false},{"id":140,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"afee367e802e466ebe0552a9b21f9d66","value":"毛领","defaultChecked":false,"removed":false},{"id":141,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"187f915e7af843d9a6b010070686e014","value":"裙摆","defaultChecked":false,"removed":false},{"id":142,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"7e5e235641ef4304a18e4043968d8419","value":"腰带","defaultChecked":false,"removed":false},{"id":143,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"5e921cda6b604269bd77a163b5d628da","value":"背带","defaultChecked":false,"removed":false},{"id":144,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"6203afb086b446e0bde4d465673b2f3e","value":"腰袢","defaultChecked":false,"removed":false},{"id":145,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"016156d3fbae4bea8acda45cc29085e5","value":"膝盖","defaultChecked":false,"removed":false},{"id":146,"createDate":1521859886000,"lastUpdateDate":1521859886000,"uuid":"49dd028a92b142ffac562936d469f87f","value":"裤脚","defaultChecked":false,"removed":false}],"active":true,"parent":null,"parentOptionalValue":null}],"parent":{"id":5,"createDate":1521858298000,"lastUpdateDate":1521859980000,"uuid":"c9c0bd54c379412b8b501bb84bb96e64","name":"产品属性","code":"product","displayMode":"pop-up","attributes":[],"parent":null,"parentAttribute":null},"parentAttribute":null}]}

        dtd.resolve(a.data);

        return dtd.promise();
    },
    loadLabelData: function() {
        var dtd = $.Deferred();

        // var variable = this.getLocalVariable();
        // if (variable.id && variable.count) {

        //     $.ajax({
        //         url: this.getUrlPrefix() + '/' + variable.count,
        //         type: 'get',
        //         dataType: 'json',
        //         async: false,
        //         success: function(data) {

        //             dtd.resolve(data.data);
        //         },
        //         error: function() {
        //             dtd.reject('标签数据加载失败');
        //         }
        //     })
        // } else {

        //     dtd.reject('配置数据加载失败');
        // }
        var a = {"code":200,"errorCode":null,"errorMessage":null,"data":{"label":{"id":1,"createDate":1521857099000,"lastUpdateDate":1521945151000,"uuid":"27b070003c0547d5bcc9a02da1f96c1e","name":"画布属性","code":"canvas","displayMode":"default","attributes":[],"parent":null,"parentAttribute":null},"attribute":{"id":1,"createDate":1521857180000,"lastUpdateDate":1527479631000,"uuid":"b2a973a493d142c18823ed23c26916d4","name":"主体类型","code":"body_type","type":"SINGLE_CHOICE","priority":"YELLOW","supportBatchOperations":true,"supportFramed":false,"optionalValues":[],"active":true,"parent":null,"parentOptionalValue":null},"tasks":{"25454":"{\"req_type\":\"body_type\",\"req_uuid\":\"c55bc7dfad06445f86c4de72b62421bd\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"de36634ce2754804ac0cd57f4cfb3429\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/guangdong/flq/6b71e6e031334b37845ef46d08fa5b39/original/de36634ce2754804ac0cd57f4cfb3429.jpg\",\"attributes\":{\"body_type\":\"细节图\"},\"_id\":\"5b02c433445bd12b07fe3cea\"}}","25455":"{\"req_type\":\"body_type\",\"req_uuid\":\"4fcfa6146c9f4e8f9c6894a6fb429112\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"9009afffd9ea4b7985822cc825532b99\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/guangdong/michi/b458bc5d787242c1abed74baab845a6e/original/9009afffd9ea4b7985822cc825532b99.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5b0e6a047f2d641ae05ecb19\"}}","25456":"{\"req_type\":\"body_type\",\"req_uuid\":\"5d0b021ce9c74f3aa2899fc445562409\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"0f1e18101e454c20baeeb8458338ccf8\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/SHANDONG/DAKS/947f9436a6f047149184275c33533efc/original/0f1e18101e454c20baeeb8458338ccf8.JPG\",\"attributes\":{\"body_type\":\"细节图\"},\"_id\":\"5b04e8c9445bd13047b0478b\"}}","25457":"{\"req_type\":\"body_type\",\"req_uuid\":\"0044ba697db341f98c7b22ad6160d928\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"e4950205c96e4c049044c337c7822fbf\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/guangdong/UR888/a90bc0be05304cdf9f13bad158562688/original/e4950205c96e4c049044c337c7822fbf.JPG\",\"attributes\":{\"body_type\":\"洗唛图\"},\"_id\":\"5af8fdb3445bd10e4ac0573c\"}}","25458":"{\"req_type\":\"body_type\",\"req_uuid\":\"2f79c2f2b87040e39c23ada5d141b994\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"7a68e8172da741d5ac92555e2f8af59c\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/zj/xgj/f6ba53826fdd40a2b9e214a462f3271c/original/7a68e8172da741d5ac92555e2f8af59c.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5b066a5f7f2d64040677963c\"}}","25459":"{\"req_type\":\"body_type\",\"req_uuid\":\"618d5bda42e64f998707c307ec88ebce\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"82f4be9c20ab498781f0ff0a3466c152\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/JS/mxs/48de5fbca60049b0870386fe9921ebc3/original/82f4be9c20ab498781f0ff0a3466c152.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5b1747a67f2d64337f8eb50f\"}}","25460":"{\"req_type\":\"body_type\",\"req_uuid\":\"e87c86fb1a3042b69e4a9ebea572aceb\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"8f95185034434d36953cd055181c1abd\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/zj/mjth/a970163584ca4377be23cf5161ba0247/original/8f95185034434d36953cd055181c1abd.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5af7e3bf445bd10b8a0ddbcc\"}}","25461":"{\"req_type\":\"body_type\",\"req_uuid\":\"ae5b9b5f5b214abcb80e320c393f1d7d\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"b498c64def454db089c86535eb443a9f\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/JS/yoho/10f081fce63b41aa81b6e918877b8ace/original/b498c64def454db089c86535eb443a9f.jpg\",\"attributes\":{\"body_type\":\"静物图\"},\"_id\":\"5b1674487f2d643200c60406\"}}","25462":"{\"req_type\":\"body_type\",\"req_uuid\":\"1c0e05ff20e24b42bf460f0e363e0b97\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"39c7a24134e54cbc9289a259ce4a47c7\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/guangdong/qianlixiu/7e21b29d8fa5411fb964fe9727cc7e6c/original/39c7a24134e54cbc9289a259ce4a47c7.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5b0e45527f2d641a40a56f63\"}}","25463":"{\"req_type\":\"body_type\",\"req_uuid\":\"4ed057e9722f4fabb871ac24995436ad\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"edf293c5c0424830b7973a6071c6dd53\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/SHaH/EBRA/069df497bf96464a9ee0685313422e90/original/edf293c5c0424830b7973a6071c6dd53.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5b1dd94b7f2d6446180e8638\"}}","25464":"{\"req_type\":\"body_type\",\"req_uuid\":\"cfc08291933c47aa8ab63d92b6713fee\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"cf527f28db30462bba48345286660157\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/BJ/LIMEFLARE/3e9a6e1ab5b545fea488b89a7b13008d/original/cf527f28db30462bba48345286660157.jpg\",\"attributes\":{\"body_type\":\"细节图\"},\"_id\":\"5b1a632e7f2d643d1c1bac3b\"}}","25465":"{\"req_type\":\"body_type\",\"req_uuid\":\"6ef61c7d5c1d468a92e787589c722d6c\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"b8064d682b9b42b3b6ff0f3efb56dda1\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/zj/ttj/b635959269664f31a7c1c63ecbd78d79/original/b8064d682b9b42b3b6ff0f3efb56dda1.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5b15f0397f2d642fa0dfdf41\"}}","25466":"{\"req_type\":\"body_type\",\"req_uuid\":\"a9c5b0b2f2354cc89decdcc1596860b1\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"5cba4fabda75440496047a2d6d4cb24f\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/zj/mgxx/0cfca55bf5214e3897bfcae58d265466/original/5cba4fabda75440496047a2d6d4cb24f.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5b1dcb2d7f2d6445d8efb45d\"}}","25467":"{\"req_type\":\"body_type\",\"req_uuid\":\"d7a42246f6c54494b38368c7370c7464\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"18e6e007dc644b4a80368acb4de3615a\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/guangdong/midi/01ffc7a7eccc404f81589974691436c5/original/18e6e007dc644b4a80368acb4de3615a.jpg\",\"attributes\":{\"body_type\":\"细节图\"},\"_id\":\"5b0664937f2d6403e63210f9\"}}","25468":"{\"req_type\":\"body_type\",\"req_uuid\":\"83359b1c42fa497db6eec49666df48d2\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"9d4b69ed8d3849828e7a363048a9c14f\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/BJ/mrrs/1a92a56501814ae995bee767a6430ab9/original/9d4b69ed8d3849828e7a363048a9c14f.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5b1b36037f2d643e9b52beff\"}}","25469":"{\"req_type\":\"body_type\",\"req_uuid\":\"40c95462c7e64583a9f0f569c2ec46e8\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"c6b47b4871854e65bdf91e5db9fa7fd3\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/guangdong/aum/d450926ffe8b4ff8ba62fd4f9f14a635/original/c6b47b4871854e65bdf91e5db9fa7fd3.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5b0f4a7b7f2d641ca0f183e3\"}}","25470":"{\"req_type\":\"body_type\",\"req_uuid\":\"0f2a9a1c9d80416f8b9bd75081b93469\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"8f10b26db323452c892c967a1e2e3a88\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/SHaH/AK/d0aa0c9f32684151b2f7af50efbc215c/original/8f10b26db323452c892c967a1e2e3a88.jpg\",\"attributes\":{\"body_type\":\"吊牌图\"},\"_id\":\"5afd4bf3445bd11b2ba3f9fe\"}}","25471":"{\"req_type\":\"body_type\",\"req_uuid\":\"7c79792cd9c741c3b99594e0233b1085\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"cec3136276a34df1b7c8f00285458e8b\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/JS/SDEER/2d595d028397472aa1adcaf6d6aadb84/original/cec3136276a34df1b7c8f00285458e8b.jpg\",\"attributes\":{\"body_type\":\"面料图\"},\"_id\":\"5b0e0d037f2d641940b7a005\"}}","25472":"{\"req_type\":\"body_type\",\"req_uuid\":\"9344d949f9b2407a924da0fa389a6a12\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"808c4bbceb754e96989de171da32e1cf\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/guangdong/UR888/04dc14898c37496caecef48be9f65976/original/808c4bbceb754e96989de171da32e1cf.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5b1dd94b7f2d6446180e80f0\"}}","25473":"{\"req_type\":\"body_type\",\"req_uuid\":\"180584bfc8254ad9af4527be89999390\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"ea631eff73ce4bfaaba97b1a87c5d66d\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/zj/ALT/bc7a53b788a74c65ba471c02172e81d0/original/ea631eff73ce4bfaaba97b1a87c5d66d.jpg\",\"attributes\":{\"body_type\":\"洗唛图\"},\"_id\":\"5b07e0a37f2d640864e4f8a1\"}}","25474":"{\"req_type\":\"body_type\",\"req_uuid\":\"40a8939cf08e4da9813d3f9fdc71e870\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"56d4f01caa01427fa506e2cf8cd94bc3\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/HUBEI/Jeanswest/f4bbf47b3b0f4ff7a9b26ce40ca4205a/original/56d4f01caa01427fa506e2cf8cd94bc3.JPG\",\"attributes\":{\"body_type\":\"细节图\"},\"_id\":\"5af90350445bd10e6a963d29\"}}","25475":"{\"req_type\":\"body_type\",\"req_uuid\":\"bd984577bc794b748cc3ddd8c88707e1\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"09b9bcb581b74c6f8c59278a36670d87\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/guangdong/missshine/85cc45033ed241c38d4775882256ebde/original/09b9bcb581b74c6f8c59278a36670d87.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5afabefe445bd1140a0139a0\"}}","25476":"{\"req_type\":\"body_type\",\"req_uuid\":\"2738b3078d3848a9bd17ae13b0af03e8\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"ab928c7c1335407f84d074b1d54dd409\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/SHANDONG/SOUP1/531a4519754a46e180fc024c100d6037/original/ab928c7c1335407f84d074b1d54dd409.jpg\",\"attributes\":{},\"_id\":\"5b0e45527f2d641a40a56938\"}}","25477":"{\"req_type\":\"body_type\",\"req_uuid\":\"1ea46218456c4784b1fbf81c6dd7abcc\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"9800150cacac4483a1bdb57c5a2e391c\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/zj/freamve/57c80b4530db4edf9cc80d37ad24a259/original/9800150cacac4483a1bdb57c5a2e391c.jpg\",\"attributes\":{\"body_type\":\"细节图\"},\"_id\":\"5b0f589c7f2d641ce07a0af8\"}}","25478":"{\"req_type\":\"body_type\",\"req_uuid\":\"58a315ee03ea4d22bb427a6561e6da64\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"df1796fa8396471ea4bfa0041d48eb71\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/FJ/qiweier/6fa98dae4a8148148021025873d5b7d7/original/df1796fa8396471ea4bfa0041d48eb71.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5b04f6c0445bd13087a8e544\"}}","25479":"{\"req_type\":\"body_type\",\"req_uuid\":\"a4c4805e9c1049248222ef3d560a7290\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"3730199973bf494791a820092984cf04\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/zj/ayilian/cf6a3a17b6744aefb15c9497454ceddd/original/3730199973bf494791a820092984cf04.jpg\",\"attributes\":{\"body_type\":\"细节图\"},\"_id\":\"5b0f589c7f2d641ce07a01e6\"}}","25480":"{\"req_type\":\"body_type\",\"req_uuid\":\"fa58c652e41e48f29e4311214f5c91f4\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"ebd2c60c949946f58d07ba748becc1f3\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/SHaH/DAZZLE/351dd7769ac24c969bf2b9b346677e94/original/ebd2c60c949946f58d07ba748becc1f3.jpg\",\"attributes\":{\"body_type\":\"模特图\"},\"_id\":\"5b0feaec7f2d641f8081ae32\"}}","25481":"{\"req_type\":\"body_type\",\"req_uuid\":\"4af5d08d44be4bf388a8fc99f637def6\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"dfe91b7be9024ca49845a42ca7ec1141\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/guangdong/SANFU/e6cee70e0162442da69d009563337216/original/dfe91b7be9024ca49845a42ca7ec1141.jpg\",\"attributes\":{\"body_type\":\"组合图\"},\"_id\":\"5affa2ae445bd12149c9c20e\"}}","25482":"{\"req_type\":\"body_type\",\"req_uuid\":\"b5e19f6ff8ba49eca82a441e34e8d4e9\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"2af19573330048658fa40018c097cf2c\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/guangdong/SANFU/dd80c959c848499db27ce9475fb52c0a/original/2af19573330048658fa40018c097cf2c.JPG\",\"attributes\":{\"body_type\":\"细节图\"},\"_id\":\"5b18df737f2d64387eaedf71\"}}","25483":"{\"req_type\":\"body_type\",\"req_uuid\":\"589f1eef66d543c0a98ee1ef07e764eb\",\"req_info\":{\"polygon\":{\"pt\":[{\"y\":0.0,\"x\":1.0},{\"y\":1.0,\"x\":1.0},{\"y\":1.0,\"x\":0.0},{\"y\":0.0,\"x\":0.0}]},\"pic_uuid\":\"68133492edd54f5e977610c4b1675d20\",\"parts\":[],\"picurl\":\"http://product.resources.soomey.com/zj/luxebay/9716170634e64ac58e9c60778993ee05/original/68133492edd54f5e977610c4b1675d20.JPG\",\"attributes\":{\"body_type\":\"静物图\"},\"_id\":\"5b18d9a57f2d64385e261465\"}}"}}};
        dtd.resolve(a.data);
        return dtd.promise();
    },
    getLocalVariable: function () {

        var variable = {};
        window.location.search.substr(1).replace(/[^&]+/g, function($1) {
            var temp = $1.split('=');
            variable[temp[0]] = temp[1];
        });
        return variable;
    },
    getUrlPrefix: function () {

        var variable = this.getLocalVariable();
        var baseUrl = (this.checking ? '/admin/task/label/review/rest/backlog/batch/' : '/admin/task/label/label/rest/backlog/batch/') + variable.id;
        return baseUrl;
    },
    getFinishedUrl: function () {

        return this.getUrlPrefix() + (this.checking ? '/qualified' : '/finished');
    },
    getUnqualifiedUrl: function () {

        return this.getUrlPrefix() + '/unqualified';
    },
    getAbandonUrl: function () {

        return this.getUrlPrefix() + '/abandoned';
    },
    getIllegalUrl: function () {

        return this.getUrlPrefix() + '/illegal';
    },
    getTaskItem: function(index) {
        var li = document.createElement('li'),
            viewBox = document.createElement('div');

        viewBox.setAttribute('class', 'viewbox');
        li.setAttribute('id', 'task_' + index);
        li.appendChild(this.getImageContainer());
        li.appendChild(viewBox);

        return li;
    },
    getImageContainer: function() {
        var container = document.createElement('div'),
            view = document.createElement('span'),
            checkboxWrapper = document.createElement('div'),
            can = document.createElement('canvas'),
            input = document.createElement('input'),
            checkedIcon = document.createElement('span'),
            img = document.createElement('img');

        container.setAttribute('class', 'ulFlatItem_wrapper');
        view.setAttribute('class', 'view');
        checkboxWrapper.setAttribute('class', 'checkbox-wrapper');
        can.setAttribute('class', 'outline_canvas');
        input.setAttribute('type', 'checkbox');
        input.setAttribute('lay-ignore', '');
        checkedIcon.setAttribute('class', 'checkedIcon');

        checkboxWrapper.appendChild(input);
        checkboxWrapper.appendChild(checkedIcon);
        container.appendChild(view);
        container.appendChild(img);
        container.appendChild(can);
        container.appendChild(checkboxWrapper);

        return container;
    },
    imageLoadAsync: function(container, k, req_info, tagInfo, i) {
        var dtd = $.Deferred(),
            img = new Image(),
            taskWrapper = $(this.getTaskItem(i)),
            self = this,
            can;

        container.append(taskWrapper);
        var picurl = req_info.picurl;
        if (picurl) {
            picurl = picurl.replace('product.resources', 'product2.resources');
            if (picurl.indexOf('product2.resources') > -1) {
                picurl += '@!220';
            }
        }
        img.src = picurl;
        img.onload = function() {
            try { // 屏蔽req_info格式错误
                var coords = req_info.polygon.pt;
            } catch(err) {
                return dtd.resolve({
                    key: k,
                    status: 'failed'
                });
            }
            var times = this.width / self.defaultWidth;
            taskWrapper.find('img').attr('src', this.src);
            taskWrapper.find('.viewbox').attr('data-src', req_info.picurl);
            taskWrapper.attr('data-size', this.width + '*' + this.height);
            taskWrapper.append($(createSelect(tagInfo, 'itemSelect', self.checking)));
            can = taskWrapper.find('canvas')[0];
            can.width = self.defaultWidth;
            can.height = this.height / times;

            if (coords && coords.length > 0) {
                var newCoords = coords.map(function(coord) {
                    return {
                        x: coord.x * can.width,
                        y: coord.y * can.height
                    }
                })
                var newCoordsSorted = newCoords.concat().sort(function (a, b) {
                    if (a.x > b.x) {
                        return 1;
                    } else if (a.x === b.x && a.y > b.y) {
                        return 1;
                    } else {
                        return 0;
                    }
                })

                if (checkPolygonIsRect(newCoords)) {
                    drawClothBox(can, newCoordsSorted, 1);
                } else {
                    drawClothBox(can, newCoords, 0);
                }
            }

            dtd.resolve({
                key: k,
                status: 'success'
            });
        }
        img.onerror = function() {
            console.log(k, JSON.stringify(req_info))
            taskWrapper.hide().find('input[type="checkbox"]').attr('disabled', true);
            dtd.resolve({
                key: k,
                status: 'failed'
            });
        }
        return dtd.promise();
    },
    bindChangeLabelType: function() {
        var self = this;
        $('#type_container').on('click', '.define-btn', function() {
            $(this).addClass('choose').siblings('.define-btn').removeClass('choose');
            var type = $(this).text().trim();
            type = type === '查看全部' ? '' : type;
            self.checkErrorItem = false;
            $('#ulFlag > li[data-size]').each(function() {
                if ($(this).attr('data-locked')) {
                    return $(this).hide();
                }
                if (type === '查看其他') {
                    !$(this).attr('data-type') && $(this).show() || $(this).hide();
                } else if (type) {
                    $(this).attr('data-type') === type && $(this).show() || $(this).hide();
                } else {
                    $(this).show();
                }
            })
        })
    },
    eventsListener: function(successList, valueList, tag, optionsLength) { // 事件监听中心
        var self = this,
            errorContainer = $('#errorTempContainer'),
            sendBackContainer = $('#sendBackContainer'),
            giveUpContaner = $('#giveUpContainer');
        this.eventsDom.on('labelTypeChanged changeSelect userAction', function(e, arg1) {
            switch (e.type) {
                case 'labelTypeChanged':
                    self.getLabelTypeBtn(successList, valueList, tag, 0, optionsLength);
                    break;
                case 'changeSelect':
                    $('#multiOption_wrapper > input[type="radio"]').prop('checked', false);
                    self.form.render();
                    break;
                case 'userAction':
                    if (arg1 === 'error') {
                        self.errorList.length === 0 ? errorContainer.hide() : errorContainer.show();
                        self.userTempAction(arg1, errorContainer);
                    } else if (arg1 === 'sendBack') {
                        self.sendBackList.length === 0 ? sendBackContainer.hide() : sendBackContainer.show();
                        self.userTempAction(arg1, sendBackContainer);
                    } else if (arg1 === 'giveUp') {
                        self.giveUpList.length === 0 ? giveUpContaner.hide() : giveUpContaner.show();
                        self.userTempAction(arg1, giveUpContaner);
                    }
                    break;
            }
        })
    },
    userTempAction: function(type, container) {
        var list = type === 'error' ? this.errorList : (type=== 'sendBack' ? this.sendBackList : this.giveUpList);
        var labelContainer = container.find('.label-container').eq(0);
        var strArr = [];
        if (list.length > 1) {
            list = list.concat();
            list.unshift('查看全部');
        }
        list.forEach(function(item) {
            strArr.push('<span class="define-btn" '+ (item === '查看全部' ? '' : 'data-id=' + item) +'>' + item + (item === '查看全部' ? '' : '<a href="javascript:void(0)">&times;</a>') + '</span>')
        })
        labelContainer.empty().append(strArr.join(''));
    },
    bindUserActionRemove: function() {
        var self = this;
        var eventsHandler = function(e, list, type) {
            var id = $(e.target).closest('.define-btn').attr('data-id');
            if (e.target.tagName.toLowerCase() === 'a') {
                list.splice(list.indexOf(id), 1);
                self.eventsDom.trigger('userAction', type);
                $('#task_' + id).removeAttr('data-locked');
                self.checkErrorItem ? $('#task_' + id).hide() : $('#task_' + id).show()
            } else {
                self.checkErrorItem = true;
                if ($(e.target).text().trim() === '查看全部') {
                    self.eventsDom.children('li').hide();
                    list.forEach(function(_id) {
                        $('#task_' + _id).show();
                    })
                } else {
                    $('#task_' + id).show().siblings().hide();
                }
            }
        }
        $('#giveUpContainer').on('click', '.define-btn', function(e) {
            eventsHandler(e, self.giveUpList, 'giveUp');
        })
        $('#errorTempContainer').on('click', '.define-btn', function(e) {
            eventsHandler(e, self.errorList, 'error');
        })
        $('#sendBackContainer').on('click', '.define-btn', function(e) {
            if (!self.checking) {
                return;
            }
            eventsHandler(e, self.sendBackList, 'sendBack');
        })
    },
    getLabelTypeBtn: function(successList, valueList, tagName, flag, optionsLength) {
        var temp = new Object(),
            tempArr = [],
            index = 0,
            valLength = 0,
            noValLength = 0,
            copyTempArr;

        successList.forEach(function (successItem) {
            var taskWrapper = $('#task_' + successItem);
            taskWrapper.attr('data-type', valueList[successItem].req_info.attributes[tagName] ? valueList[successItem].req_info.attributes[tagName] : '');

            if (!valueList[successItem].req_info.attributes[tagName]) {
                noValLength ++
                return;
            }

            flag && taskWrapper.find('select').val(valueList[successItem].req_info.attributes[tagName]);

            if (!temp[valueList[successItem].req_info.attributes[tagName]]) {
                temp[valueList[successItem].req_info.attributes[tagName]] = true;
                tempArr.push(valueList[successItem].req_info.attributes[tagName]);
                valLength ++
            }
            index ++
        })
        copyTempArr = tempArr.concat();

        if (index < successList.length || valLength > 1) {
            copyTempArr.unshift('查看全部');

        }

        if (index < successList.length && noValLength < successList.length && tempArr.length < optionsLength) {
            copyTempArr.push('查看其他');
        }
        this.insetLabelTypeBtn(copyTempArr);

        if (flag) {
            return tempArr;
        } else {
            return;
        }
    },
    batchSetVal: function(valueList, name) {
        var self = this;
        this.form.on('radio(choice)', function(data){
            var keys = self.getSelectedKey();
            keys.forEach(function(k) {
                valueList[k].req_info.attributes[name] = data.value;
                $('#task_' + k).find('select[lay-filter="itemSelect"]').val(data.value);
            })
            keys.length > 0 && self.form.render('select'),self.eventsDom.trigger('labelTypeChanged'),$('#ulFlag .checkbox-wrapper input[type="checkbox"]:checked').prop('checked', false),$('#selectAll input[type="checkbox"]').prop('checked', false),self.form.render('checkbox');
        });

    },
    getSelectedKey: function() {
        var selectedKey = [];
        $('#ulFlag > li').each(function() {
            if ($(this).has('input[type="checkbox"]:not(:disabled):checked').length > 0) {
                selectedKey.push(parseFloat($(this).attr('id').split('_')[1]));
            }
        })
        return selectedKey;
    },
    insetLabelTypeBtn: function(arr) {
        var str;

        str = arr.map(function(type, i) {
            return '<a href="javascript:void(0)" class="define-btn">' + type + '</a>';
        })
        $('#type_container').empty().append(str.join(''));
    },
    bindPreviewEvents: function() {
        var self = this;
        var doPreview = function(e, ele, viewBox) {
            var offset = getRelativeShift(e),
                viewSize = 100,
                viewBoxSize = 300,
                view = $(ele).find('.view'),
                left = offset.x < viewSize / 2 ? 0 : (offset.x > $(ele).width() - viewSize / 2 ? $(ele).width() - viewSize : offset.x - viewSize / 2),
                top = offset.y < viewSize / 2 ? 0 : (offset.y > $(ele).height() - viewSize / 2 ? $(ele).height() - viewSize : offset.y - viewSize / 2),
                size = $(ele).closest('li').attr('data-size').split('*'),
                times = 220 / 100;

            e.type === 'mouseenter' && view.show(),$(ele).next('.viewbox').show();

            view.css({'left': left,'top': top})

            viewBox.css({
                'background-position-x': (-left / $(ele).width() * parseFloat(size[0])) / times,
                'background-position-y': (-top / $(ele).height() * parseFloat(size[1])) / times,
                'background-size': (size[0] / times) + 'px ' + (size[1] / times) + 'px'
            })

                if (e.type !== 'mouseenter') {
                    return;
                }

                var boundingRect = ele.getBoundingClientRect();
                $(window).width() - boundingRect.right < viewBoxSize && viewBox.css({'left': 'auto', 'right': '221px'}) || viewBox.css({'left': '221px', 'right': 'auto'});
                $(window).height() - boundingRect.top < viewBoxSize && viewBox.css({'top': 'auto', 'bottom': '0'}) || viewBox.css({'top': '0', 'bottom': 'auto'});
        }

        this.eventsDom.on('mouseenter mousemove', '.ulFlatItem_wrapper', function(e) {
            if (!self.viewFlag) {
                return;
            }
            $(this).closest('li').siblings('li').find('.viewbox').hide();
            var viewBox =  $(this).next('.viewbox');

            if (!viewBox.attr('data-src')) {
                doPreview(e, this, viewBox);
            } else {
                viewBox.show().css({
                    'background-image': 'url("http://resources.deepdraw.cn/js/marking/images/form_loading.gif")',
                    'background-position': 'center'
                })

                var img = new Image();
                var that = this;
                img.src = viewBox.attr('data-src');
                img.onload = function() {
                    viewBox.css({
                        'background-image': 'url(' + this.src + ')',
                        'background-position': 'initial'
                    }).removeAttr('data-src').closest('li').attr('data-size', this.width + '*' + this.height);

                    doPreview(e, that, viewBox);
                }

                img.onerror = function() {
                    console.log('图片加载错误');
                }
            }

        }).on('mouseout', '.ulFlatItem_wrapper', function() {
            if (!self.viewFlag) {
                return;
            }
            $(this).find('.view').hide().end().next('.viewbox').hide();
        })

    },
    bindSelectItem: function() {
        var self = this;
        this.eventsDom.on('click', '.checkbox-wrapper', function() {
            if (!self.isBatch || $(this).closest('li').attr('data-locked')) {
                return;
            }
            this.querySelector('input[type=\'checkbox\']').click();
        })
    },
    bindDataChanged: function(valueList, tagCode, tempArr) {
        var self = this;
        self.form.on('checkbox(selectAll)', function(data) {
            if ($(data.elem).is(':checked')) {
                self.eventsDom.find('li[data-size]:not([data-locked]) .checkbox-wrapper>input[type="checkbox"]').not(':disabled').prop('checked', true);
            } else {
                self.eventsDom.find('li[data-size]:not([data-locked]) .checkbox-wrapper>input[type="checkbox"]').not(':disabled').prop('checked', false);
            }
            self.eventsDom.trigger('changeSelect');
            $('#ulFlag > li[data-size]:not([data-locked])').show();
        });

        self.form.on('switch(isBatch)', function() {
            self.isBatch = !self.isBatch;
            $('#selectAll').toggle();
            if(!self.isBatch) {
                $('#ulFlag .checkbox-wrapper input[type="checkbox"]:checked').prop('checked', false);
                $('#selectAll input[type="checkbox"]').prop('checked', false);
                self.form.render('checkbox');
            }
        })

        self.form.on('switch(viewFlag)', function() {
            self.viewFlag = !self.viewFlag;
        })

        self.form.on('select(itemSelect)', function(data) {
            var key = $(data.elem).closest('li').attr('id').split('_')[1];
            valueList[key].req_info.attributes[tagCode] = data.value;
            self.eventsDom.trigger('labelTypeChanged');
        });
    },
    finalSubmit: function(data) {
        var dtd = $.Deferred();
        var url = this.getFinishedUrl();
        var trackingIds = [];
        var values = [];
        for (var trackingId in data) {

            trackingIds.push(trackingId);
            values.push(JSON.stringify(data[trackingId]));
        }
        if (values.length === 0) {
            dtd.resolve();
        } else {
            $.ajax({
                url: url,
                type: "POST",
                data: {
                    'trackingIds': trackingIds,
                    'values': values,
                    '_method': 'PUT'
                },
                traditional: true,
                success: function() {
                    dtd.resolve();
                },
                onerror: function() {
                    dtd.reject();
                }
            })
        }
        return dtd.promise();
    },
    bindSubmitEvents: function(valueList, failedList) {
        var self = this;
        $('#submit').on('click', function() {
            if (!self.checkSeletedAll() && !self.checking) {
                return self.layer.alert('请检查是否所有选项都已操作');
            }
            var newValueList = JSON.parse(JSON.stringify(valueList));
            // 提交时先ajax提交报错数据的id
            if (failedList.length > 0) {
                self.submitErrorData(failedList, '图片加载失败', self.getIllegalUrl()).done(function() {
                    self.filtersData(newValueList, failedList);
                    self.totalDataSubmit(newValueList);
                }).fail(function() {
                    self.layer.alert('数据提交失败');
                })
            } else {
                self.totalDataSubmit(newValueList);
            }
        })

        $('#errorHanlder').on('click', function() {
            var keys = self.getSelectedKey();
            if (keys.length === 0) {
                return self.layer.alert('你最少选择一个任务才可报错');
            }

            self.openErrorModal(keys);
        })

        $('#sendBackHandler').on('click', function() {
            var keys = self.getSelectedKey();
            if (keys.length === 0) {
                return self.layer.alert('你最少选择一个任务才可退回');
            }

            self.openSendBackModal(keys);
        })

        $('#giveUpHandler').on('click', function() {
            var keys = self.getSelectedKey();
            if (keys.length === 0) {
                return self.layer.alert('你最少选择一个任务才可退回');
            }

            self.submitErrorData(keys, '' , self.getAbandonUrl()).done(function() {
                self.giveUpList = self.giveUpList.concat(keys);
                self.eventsDom.trigger('userAction', 'giveUp');
                setItemsHidden(keys);
            }).fail(function() {
                self.layer.alert('提交放弃任务数据失败');
            })
        })
    },
    totalDataSubmit: function(data) {
        var self = this;
        this.filtersData(data, this.errorList);
        this.filtersData(data, this.giveUpList);
        this.filtersData(data, this.sendBackList);
        this.finalSubmit(data).done(function() {
            self.layer.confirm('请务必确保您填写的数据正确，是否继续', {icon: 3, title:'提示'}, function(index) {
                window.location.reload();
            })
        }).fail(function() {
            self.layer.alert('数据提交失败');
        })
    },
    filtersData: function(data, filters) {
        filters.forEach(function(filter) {
            delete data[filter];
        })
    }
    ,
    submitErrorData: function(data, message ,url) {
        var dtd = $.Deferred();
        console.log(data);
        $.ajax({
            url: url,
            type: 'POST',
            data: {
                'trackingIds': data,
                'message': message,
                '_method': 'PUT'
            },
            traditional: true,
            success: function(response) {
            	console.log(response);
                dtd.resolve();
            },
            onerror: function() {
                dtd.reject();
            }
        })

        return dtd.promise();
    },
    checkSeletedAll: function() {
        var selectList = $('#ulFlag li:not([data-locked]) select[lay-filter="itemSelect"]');
        for (var i = 0; i< selectList.length; i++) {
            if (!$(selectList[i]).val()) {
                return false;
            }
        }

        return true;
    },
    openSendBackModal: function(keys) {
        var self = this;
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
                var message = $('#send_back textarea').val().trim();
                if (!message) {
                    return self.layer.alert('退回原因不能为空');
                }

                self.submitErrorData(keys, message , self.getUnqualifiedUrl()).done(function() {
                    self.layer.closeAll();
                    self.layer.alert('数据提交成功');
                    self.sendBackList = self.sendBackList.concat(keys);
                    self.eventsDom.trigger('userAction', 'sendBack');
                    setItemsHidden(keys);
                    $('#send_back').find('form')[0].reset();
                }).fail(function() {
                    self.layer.alert('发生未知错误，请重新提交');
                })

            },
            btn2: function () {
                $('#send_back').find('form')[0].reset();
            }
        });
    },
    openErrorModal: function(keys) {
        var self = this;
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

                var message = $('#error_modal').find('textarea').eq(0).val().trim();
                if (!message) {
                    return self.layer.alert('报错原因不能为空');
                }
                self.submitErrorData(keys, message, self.getIllegalUrl()).done(function() {
                    self.layer.closeAll();
                    self.layer.alert('数据提交成功');
                    self.errorList = self.errorList.concat(keys);
                    self.eventsDom.trigger('userAction', 'error');
                    setItemsHidden(keys);
                }).fail(function() {
                    self.layer.alert('发生未知错误，请重新提交');
                })
            },
            btn2: function () {
                $('#error_modal').find('form')[0].reset();
            }
        });
    }
}
