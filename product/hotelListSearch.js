var casper = require('casper').create({
	verbose: false,
    logLevel: 'info',
    onError: function(self, msg) {
        //this.capture('error.png');
        console.log('加载出错: ' + msg);
        self.exit();
    },
    pageSettings: {
        loadImages: false, // 不加载图片，为了速度更快
        loadPlugins: false
    }
}); 
var fs =  require('fs');        
phantom.outputEncoding="GBK";
var city = casper.cli.get(0);
var startDate = casper.cli.get(1);
var endDate = casper.cli.get(2);
var keyword = casper.cli.get(3);
var url = 'http://hotel.elong.com/' + city;
//设置开始执行的url和方法（第一步执行）
casper.start(url, function () {   
	var t = this.getTitle();//获取当前页面的标题
	//this.echo('---开始查找'+t+'列表数据--');//输出到命令行
});   

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


//设置第二步执行方法
casper.then(function () {   
	//this.click('#domesticDiv dl:first input');
	//设置表单数据
	//this.echo(keyword);
	this.wait(1000, function() {
		this.evaluate(function(keywordVal,startDateVal,endDateVal) {
			$(".search_keywords input").val(keywordVal);
			$(".search_date label:first input").val(startDateVal);
			$(".search_date label:last input").val(endDateVal);
		},keyword,startDate,endDate); 
	});
	
	this.wait(1000, function() {
        //this.click('#domesticDiv .submit_wrap span.search_btn');
        this.click('.btn_search_w1');
		this.echo("等待跳转"+this.getTitle()+"列表页"); 
    });
	
});


//设置第二步执行方法
var pages;
casper.then(function () {
	this.echo('开始抓取酒店列表id数据');
	this.wait(4000, function() {// 等待2秒
        var pagesVal = this.evaluate(function(){
			return $("#pageContainer a:nth-last-of-type(2)").attr("data-index");
		});
		pages = parseInt(pagesVal);
		//console.log(pagesVal);
		fs.write(startDate + "&" + endDate + "/" + city + "/hotelListTotalPage.json", pages, 'w');
    });
});

var hotelIds = '';
//设置第三步执行方法  
casper.then(function () {
	var onPage = 1;
	casper.repeat(pages,function() {  
		var waitTime = randomNum();
		//var onPage = this.fetchText("#pageContainer a[class='on']");
		this.echo('正在抓取第' + onPage + '页数据');
		this.echo("等待" + waitTime + '毫秒'); 
		this.wait(waitTime, function () {   
			var val = this.evaluate(function(){
				var ids = [];
				// var nums = $('div.h_item span.h_pri_num').text();
				var names = $('div.h_info_base p.h_info_b1 a');
				var hItem = $(".h_item");
				for(var i = 0; i < hItem.length;i++){
					ids.push($(hItem[i]).attr("data-hotelid"));
				}
				return ids;
			});
			//this.echo(val);
			hotelIds = hotelIds + ',' + val
			//写入文件
			fs.write(startDate + "&" + endDate + "/" + city + "/list/hotelList_"+onPage+".json", val, 'w');
			onPage++;
			this.echo("保存数据成功");
			nextPageBtn = '#pageContainer .page_next';
			if(this.exists(nextPageBtn)) {  
				this.waitFor(function(){
					this.echo("已经点击下一页按钮, 跳转等待....."); 
					return this.click(nextPageBtn);
				});  
			}else { 
				this.exit();
			}
		}); 
		
	});  
	

});   

//设置第N步执行方法
casper.then(function () {   
	//console.log(hotelIds.substring(1));
});

//开始执行
casper.run();