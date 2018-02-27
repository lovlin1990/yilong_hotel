var casper = require('casper').create({
	verbose: false,
    logLevel: 'info',
    onError: function(self, msg) {
        //this.capture('error.png');
        console.log('加载出错: ' + msg);
        self.exit();
    },
	clientScripts:  [
        'D:/casperjs/casperjs/includes/jquery.js'      // These two scripts will be injected in remote
    ],
    pageSettings: {
        loadImages: false, // 不加载图片，为了速度更快
        loadPlugins: false
    }
}); 
var fs =  require('fs');   
phantom.outputEncoding="GBK";
var city = casper.cli.get(0);

casper.start();

var pageI = 1;
var errorCount = 0;
casper.then(function () {
	this.echo("读取总页数json文件");
	var pages = readFile(getNowDate() + "/" + city + "/hotelListTotalPage.json",1,this,fs);
	if(pages === ''){
		this.exit();
	}
	var pagesI = parseInt(pages)
	var totalCount = 1;
	casper.repeat(pagesI,function() { 
		this.echo("读取第"+pageI+"个IDjson文件");
		this.wait(2000, function() {// 等待2秒
			var file = getNowDate() + "/" + city + "/list/hotelList_"+pageI+".json";
			var json = readFile(file,1,this,fs);
			if(json === ''){
				errorCount = errorCount+1;
			}
			if(errorCount === 4){
				this.exit();
			}
			pageI++;
			console.log("json:" + json);
			if (json !== '') {
				var hotelIds = json.split(",");
				var idCount = 1;
				casper.repeat(hotelIds.length,function() {  
					var waitTime = randomNum();
					//var onPage = this.fetchText("#pageContainer a[class='on']");
					this.echo('正在抓取第' + totalCount + '个id数据');
					this.echo("等待" + (waitTime + 2000) + '毫秒'); 
					this.wait(2000, function () {
						var hotelId = hotelIds[idCount-1];
						var url = 'http://hotel.elong.com/' + hotelId;
						casper.thenOpen(url);
						this.wait(waitTime, function() {
							var val = this.evaluate(function(){
								var hotelMap = {};
								// 查找模块
								var hotelName = $(".hrela_name div").text().trim(); // 酒店名字
								var hotelIdVal = $(".hrela_add_item:first").attr("data-hotelid"); // id
								var hotelInDateVal = $(".search_date:first input:first").val(); // 入住日期
								var hotelOutDateVal = $(".search_date:first input:last").val(); // 离店日期
								var lowMoneyVal = $(".hrela_price span:nth-child(2)").text(); // 最低价
								var hotelAddrVal = $(".hrela_name p span:first").text().trim().replace(/\n/g, ""); // 酒店地址
								var hotelPertxtNumVal = $(".pertxt_num2:first .scoreCom1").text().trim(); // 酒店好评率
								var telVal = $(".dview_info_item:first dd").text().replace(/\n/g, "").replace(/\t/g, "").trim();
								var cityVal = $(".cont_box:first .link555 a:nth-child(5)").attr("href").replace(/\//g, "").trim();
								var hotelTelVal = telVal.substring(0,telVal.indexOf("艺")).trim(); // 酒店电话
								var yilongTelVal = telVal.substring(telVal.indexOf("：")+1).trim(); // 艺龙电话
								hotelMap.hotelName = hotelName;
								hotelMap.hotelId = hotelIdVal;
								hotelMap.inDate = hotelInDateVal;
								hotelMap.outDate = hotelOutDateVal;
								hotelMap.lowMoney = lowMoneyVal;
								hotelMap.hotelPertxtNum = hotelPertxtNumVal;
								hotelMap.hotelAddr = hotelAddrVal;
								hotelMap.hotelTel = hotelTelVal;
								hotelMap.serviceTel = yilongTelVal;
								hotelMap.hotelCity = cityVal;
								var items = $(".htype_list .htype_item");
								var typeListMap = [];
								for(var i = 0;i < items.length;i++){
									// 每个模块的名称
									var typeName = $(items[i]).find(".htype_info .htype_info_name span").text().trim();
									var typeInfo = $(items[i]).find(".htype_info .htype_info_ty").text().replace(/\n/g, "");
									var typeLowMoney = $(items[i]).find(".htype_info .htype_info_num").text().trim();
									// 每个模块下面的产品参数
									var trList = $(items[i]).find(".htype_info_list table tbody tr[class!='ht_tr_other']");
									var trText = '';
									var trMap = [];
									for(var j=0;j < trList.length;j++){
										var tdMap = {};
										var v1 = $(trList[j]).find(".ht_name").text().trim();
										var v2 = $(trList[j]).find(".ht_supply").text().trim();
										var v3 = $(trList[j]).find(".ht_brak").text().trim();
										var v4 = $(trList[j]).find(".ht_rule span").text().trim();
										
										var money = $(trList[j]).find(".ht_pri .ht_pri_num").text().trim();
										var cashback = $(trList[j]).find(".ht_retu").text().trim();
										//trText += "名称：" + v1 + "供应商：" + v2 + "早餐：" + v3 + "取消规则：" + v4 + "日均价:" + money + '\n';
										tdMap.name = v1;
										tdMap.supply = v2;
										tdMap.brak = v3;
										tdMap.rule = v4;
										tdMap.money = money; 
										tdMap.cashback = cashback; // 返现
										trMap.push(tdMap);
									}
									typeListMap.push({
										'typeName':typeName,
										'typeInfo':typeInfo,
										'typeLowMoney':typeLowMoney,
										'trMap':trMap
									});
									// n += '***房间类型：' + typeName + '\n' + typeInfo + '\n'+ trText + '\n';
								}
								hotelMap.typeListMap = typeListMap;
								return hotelMap;
							});
							var jsonVal = JSON.stringify(val);
							this.echo(jsonVal);
							if(JSON.stringify(val) != 'null'){
								//写入文件
								fs.write(getNowDate() + "/" + city + "/detail/hotelDetail_"+totalCount+".json", JSON.stringify(val), 'w');
							}
							
							idCount++;
							totalCount++;
							/*if(idCount === hotelIds.length) {  
								this.exit();
							}*/
						});
					}); 
				});
			}
		});
    });
});
// 读取文件
function readFile(file,findCount,th,fsObj){
	var json = '';
	try {
		th.echo("第"+findCount+"次查找该文件");
		// 读取json文件  
		json = fsObj.read(file);
		// this.echo(json);
		// hotelIds = json.split(",");
		return json;
　　} catch(error) {
　　	// 此处是负责例外处理的语句
		// 读取json文件 
		th.echo("没有找到该文件");
　　} finally {
　　	// 此处是出口语句
		//fsObj.close();
		return json;
　　}
}
/*
casper.then(function () {
	var idCount = 1;
	casper.repeat(hotelIds.length,function() {  
		var waitTime = randomNum();
		//var onPage = this.fetchText("#pageContainer a[class='on']");
		this.echo('正在抓取第' + idCount + '个id数据');
		this.echo("等待" + waitTime + '毫秒'); 
		this.wait(waitTime, function () {   
			var url = 'http://hotel.elong.com/' + hotelIds[idCount-1];
			casper.thenOpen(url);
			this.wait(randomNum(), function() {
				var val = this.evaluate(function(){
					var hotelMap = {};
					// 查找模块
					var hotelName = $(".hrela_name div").text().trim();
					hotelMap.hotelName = hotelName;
					var items = $(".htype_list .htype_item");
					var typeListMap = [];
					for(var i = 0;i < items.length;i++){
						// 每个模块的名称
						var typeName = $(items[i]).find(".htype_info .htype_info_name span").text().trim();
						var typeInfo = $(items[i]).find(".htype_info .htype_info_ty").text().trim();
						// 每个模块下面的产品参数
						var trList = $(items[i]).find(".htype_info_list table tbody tr[class!='ht_tr_other']");
						var trText = '';
						var trMap = [];
						for(var j=0;j < trList.length;j++){
							var tdMap = {};
							var v1 = $(trList[j]).find(".ht_name").text().trim();
							var v2 = $(trList[j]).find(".ht_supply").text().trim();
							var v3 = $(trList[j]).find(".ht_brak").text().trim();
							var v4 = $(trList[j]).find(".ht_rule span").text().trim();
							var money = $(trList[j]).find(".ht_pri .ht_pri_num").text().trim();
							//trText += "名称：" + v1 + "供应商：" + v2 + "早餐：" + v3 + "取消规则：" + v4 + "日均价:" + money + '\n';
							tdMap.name = v1;
							tdMap.supply = v2;
							tdMap.brak = v3;
							tdMap.rule = v4;
							tdMap.money = money;
							trMap.push(tdMap);
						}
						typeListMap.push({
							'typeName':typeName,
							'trMap':trMap
						});
						// n += '***房间类型：' + typeName + '\n' + typeInfo + '\n'+ trText + '\n';
					}
					hotelMap.typeListMap = typeListMap;
					return hotelMap;
				});
				this.echo(JSON.stringify(val));
				idCount++;
				if(idCount === hotelIds.length) {  
					this.exit();
				}
			});
		}); 
	});  
	

}); 
*/
/*
//设置第二步执行方法
casper.then(function () {
	var waitTime = randomNum();
	this.wait(2000, function() {
        var val = this.evaluate(function(){
			var hotelMap = {};
			// 查找模块
			var hotelName = $(".hrela_name div").text().trim();
			hotelMap.hotelName = hotelName;
			var items = $(".htype_list .htype_item");
			var typeListMap = [];
			for(var i = 0;i < items.length;i++){
				// 每个模块的名称
				var typeName = $(items[i]).find(".htype_info .htype_info_name span").text().trim();
				var typeInfo = $(items[i]).find(".htype_info .htype_info_ty").text().trim();
				// 每个模块下面的产品参数
				var trList = $(items[i]).find(".htype_info_list table tbody tr[class!='ht_tr_other']");
				var trText = '';
				var trMap = [];
				for(var j=0;j < trList.length;j++){
					var tdMap = {};
					var v1 = $(trList[j]).find(".ht_name").text().trim();
					var v2 = $(trList[j]).find(".ht_supply").text().trim();
					var v3 = $(trList[j]).find(".ht_brak").text().trim();
					var v4 = $(trList[j]).find(".ht_rule span").text().trim();
					var money = $(trList[j]).find(".ht_pri .ht_pri_num").text().trim();
					//trText += "名称：" + v1 + "供应商：" + v2 + "早餐：" + v3 + "取消规则：" + v4 + "日均价:" + money + '\n';
					tdMap.name = v1;
					tdMap.supply = v2;
					tdMap.brak = v3;
					tdMap.rule = v4;
					tdMap.money = money;
					trMap.push(tdMap);
				}
				typeListMap.push({
					'typeName':typeName,
					'trMap':trMap
				});
				// n += '***房间类型：' + typeName + '\n' + typeInfo + '\n'+ trText + '\n';
			}
			hotelMap.typeListMap = typeListMap;
			return hotelMap;
		});
		this.echo(JSON.stringify(val));
    });
	
}); 
*/
//生成1-10秒的数
function randomNum(){
	var count = Math.round(Math.random()*9+1);
	var cv = parseInt(count);
	if(cv <= 3){
		cv += 3;
	}
	return cv*1000;
}
//获取当前日期
function getNowDate(){
	var now = new Date();
	var year = now.getFullYear();
	var month = now.getMonth() + 1;
	if(Number(month) < 10){
		month = "0" + month;
	}
	var day = now.getDate();
	if(Number(day) < 10){
		day = "0" + day;
	}
	return year + "" + month +  "" + day;
}


//开始执行
casper.run();