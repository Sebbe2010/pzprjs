//
// パズル固有スクリプト部 マイナリズム版 minarism.js
//
(function(pidlist, classbase){
	if(typeof module==='object' && module.exports){module.exports = [pidlist, classbase];}
	else{ pzpr.classmgr.makeCustom(pidlist, classbase);}
}(
['minarism'], {
//---------------------------------------------------------
// マウス入力系
MouseEvent:{
	mouseinput : function(){
		if(this.puzzle.playmode){
			if(this.mousestart){ this.inputqnum();}
		}
		else if(this.puzzle.editmode){
			if(this.mousestart || this.mousemove){
				if(this.btn==='left'){ this.inputmark_mousemove();}
			}
			else if(this.mouseend && this.notInputted()){
				this.inputmark_mouseup();
			}
		}
	},

	inputmark_mousemove : function(){
		var pos = this.getpos(0);
		if(pos.getc().isnull){ return;}

		var border = this.prevPos.getnb(pos);
		if(!border.isnull){
			this.inputData = this.prevPos.getdir(pos,2);
			border.setQdir(this.inputData!==border.qdir?this.inputData:0);
			border.draw();
			this.mousereset();
			return;
		}
		this.prevPos = pos;
	},
	inputmark_mouseup : function(){
		var pos = this.getpos(0.33);
		if(!pos.isinside()){ return;}

		if(!this.cursor.equals(pos)){
			this.setcursor(pos);
			pos.draw();
		}
		else{
			var border = pos.getb();
			if(border.isnull){ return;}

			var qn=border.qnum, qs=border.qdir, qm=(border.isHorz()?0:2);
			var max=Math.max(this.board.cols,this.board.rows)-1;
			if(this.btn==='left'){
				if     (qn===-1 && qs===0)   { border.setQnum(-1); border.setQdir(qm+1);}
				else if(qn===-1 && qs===qm+1){ border.setQnum(-1); border.setQdir(qm+2);}
				else if(qn===-1 && qs===qm+2){ border.setQnum(1);  border.setQdir(0);}
				else if(qn===max)            { border.setQnum(-2); border.setQdir(0);}
				else if(qn===-2)             { border.setQnum(-1); border.setQdir(0);}
				else{ border.setQnum(qn+1);}
			}
			else if(this.btn==='right'){
				if     (qn===-1 && qs===0)   { border.setQnum(-2); border.setQdir(0);}
				else if(qn===-2)             { border.setQnum(max);border.setQdir(0);}
				else if(qn=== 1 && qs===0)   { border.setQnum(-1); border.setQdir(qm+2);}
				else if(qn===-1 && qs===qm+2){ border.setQnum(-1); border.setQdir(qm+1);}
				else if(qn===-1 && qs===qm+1){ border.setQnum(-1); border.setQdir(0);}
				else{ border.setQnum(qn-1);}
			}
			border.draw();
		}
	}
},

//---------------------------------------------------------
// キーボード入力系
KeyEvent:{
	enablemake : true,
	enableplay : true,
	moveTarget : function(ca){
		if     (this.puzzle.editmode){ return this.moveTBorder(ca);}
		else if(this.puzzle.playmode){ return this.moveTCell(ca);}
		return false;
	},

	keyinput : function(ca){
		if     (this.puzzle.editmode){ this.key_inputmark(ca);}
		else if(this.puzzle.playmode){ this.key_inputqnum(ca);}
	},
	key_inputmark : function(ca){
		var border = this.cursor.getb();
		if(border.isnull){ return;}

		if(ca==='q'||ca==='w'||ca==='e'||ca===' '||ca==='-'){
			var tmp=border.NDIR;
			if(ca==='q'){ tmp=(border.isHorz()?border.UP:border.LT);}
			if(ca==='w'){ tmp=(border.isHorz()?border.DN:border.RT);}

			border.setQdir(border.qdir!==tmp?tmp:border.NDIR);
			border.setQnum(-1);
		}
		else if('0'<=ca && ca<='9'){
			var num = +ca, cur = border.qnum;
			var max = Math.max(this.board.cols,this.board.rows)-1;

			border.setQdir(border.NDIR);
			if(cur<=0 || this.prev!==border){ if(num<=max){ border.setQnum(num);}}
			else{
				if(cur*10+num<=max){ border.setQnum(cur*10+num);}
				else if  (num<=max){ border.setQnum(num);}
			}
		}
		else{ return;}

		this.prev = border;
		border.draw();
	}
},

TargetCursor:{
	adjust_modechange : function(){
		this.bx -= ((this.bx+1)%2);
		this.by -= ((this.by+1)%2);
	}
},

//---------------------------------------------------------
// 盤面管理系
Cell:{
	maxnum : function(){
		return Math.max(this.board.cols,this.board.rows);
	}
},
Board:{
	cols : 7,
	rows : 7,

	hasborder : 1
},
BoardExec:{
	adjustBoardData : function(key,d){
		this.adjustBorderArrow(key,d);
	}
},

//---------------------------------------------------------
// 画像表示系
Graphic:{
	hideHatena : true,

	gridcolor_type : "LIGHT",

	numbercolor_func : "anum",

	paint : function(){
		this.drawBDBase();

		this.drawBGCells();
		this.drawDashedGrid();

		this.drawBDNumbers_and_IneqSigns();
		this.drawNumbers();

		this.drawChassis();

		this.drawTarget_minarism();
	},

	drawBDBase : function(){
		var g = this.vinc('border_base', 'auto');
		if(!g.use.canvas){ return;}

		var csize = this.cw*0.29;
		var blist = this.range.borders;
		for(var i=0;i<blist.length;i++){
			var border = blist[i];

			if(border.qdir!==0 || border.qnum!==-1){
				var px = border.bx*this.bw, py = border.by*this.bh;
				g.fillStyle = "white";
				g.fillRectCenter(px, py, csize, csize);
			}
		}
	},
	drawBDNumbers_and_IneqSigns : function(){
		var g = this.vinc('border_marks', 'auto', true);

		var csize = this.cw*0.27;
		var ssize = this.cw*0.22;

		g.lineWidth = 1;
		g.strokeStyle = this.quescolor;

		var option = {ratio:[0.45]};
		var blist = this.range.borders;
		for(var i=0;i<blist.length;i++){
			var border=blist[i], px = border.bx*this.bw, py = border.by*this.bh;

			// ○の描画
			g.vid = "b_cp_"+border.id;
			if(border.qnum!==-1){
				g.fillStyle = (border.error===1 ? this.errcolor1 : "white");
				g.shapeCircle(px, py, csize);
			}
			else{ g.vhide();}

			// 数字の描画
			g.vid = "border_text_"+border.id;
			if(border.qnum>0){
				g.fillStyle = this.fontcolor;
				this.disptext(""+border.qnum, px, py, option);
			}
			else{ g.vhide();}

			// 不等号の描画
			g.vid = "b_is1_"+border.id;
			if(border.qdir===border.UP||border.qdir===border.LT){
				g.beginPath();
				switch(border.qdir){
					case border.UP: g.setOffsetLinePath(px,py ,-ssize,+ssize ,0,-ssize ,+ssize,+ssize, false); break;
					case border.LT: g.setOffsetLinePath(px,py ,+ssize,-ssize ,-ssize,0 ,+ssize,+ssize, false); break;
				}
				g.stroke();
			}
			else{ g.vhide();}
			
			g.vid = "b_is2_"+border.id;
			if(border.qdir===border.DN||border.qdir===border.RT){
				g.beginPath();
				switch(border.qdir){
					case border.DN: g.setOffsetLinePath(px,py ,-ssize,-ssize ,0,+ssize ,+ssize,-ssize, false); break;
					case border.RT: g.setOffsetLinePath(px,py ,-ssize,-ssize ,+ssize,0 ,-ssize,+ssize, false); break;
				}
				g.stroke();
			}
			else{ g.vhide();}
		}
	},

	drawTarget_minarism : function(){
		this.drawCursor(this.puzzle.playmode);
	}
},

//---------------------------------------------------------
// URLエンコード/デコード処理
Encode:{
	decodePzpr : function(type){
		this.decodeMinarism(type);
	},
	encodePzpr : function(type){
		this.encodeMinarism(type);
	},

	decodeMinarism : function(type){
		// 盤面外数字のデコード
		var parser = this.puzzle.pzpr.parser;
		var id=0, a=0, mgn=0, bstr = this.outbstr, bd=this.board;
		var bdmax = bd.border.length;
		if(type===parser.URL_PZPRAPP){ bdmax+=(bd.cols+bd.rows);}
		for(var i=0;i<bstr.length;i++){
			var ca = bstr.charAt(i);

			if(type===parser.URL_PZPRAPP){
				if     (id<bd.cols*bd.rows)  { mgn=((id/bd.cols)|0);}
				else if(id<2*bd.cols*bd.rows){ mgn=bd.rows;}
			}
			var border = bd.border[id-mgn];

			var tmp=0;
			if     (this.include(ca,'0','9')||this.include(ca,'a','f')){ border.qnum = parseInt(ca,16);}
			else if(ca==="-"){ border.qnum = parseInt(bstr.substr(i+1,2),16); i+=2;}
			else if(ca==="."){ border.qnum = -2;}
			else if(ca==="g"){ tmp = ((type===parser.URL_PZPRV3 || id<bd.cols*bd.rows)?1:2);}
			else if(ca==="h"){ tmp = ((type===parser.URL_PZPRV3 || id<bd.cols*bd.rows)?2:1);}
			else if(this.include(ca,'i','z')){ id+=(parseInt(ca,36)-18);}
			else if(type===parser.URL_PZPRAPP && ca==="/"){ id=bd.cell.length-1;}

			if     (tmp===1){ border.qdir = (border.isHorz()?border.UP:border.LT);}
			else if(tmp===2){ border.qdir = (border.isHorz()?border.DN:border.RT);}

			id++;
			if(id>=bdmax){ a=i+1; break;}
		}
		this.outbstr = bstr.substr(a);
	},
	encodeMinarism : function(type){
		var parser = this.puzzle.pzpr.parser;
		var cm="", count=0, bd=this.board;
		for(var id=0;id<bd.border.length;id++){
			var pstr="", border=bd.border[id];
			if(!!border){
				var dir=border.qdir, qnum=border.qnum;

				if     (dir===border.UP||dir===border.LT){ pstr = ((type===parser.URL_PZPRV3 || !!bd.cell[id])?"g":"h");}
				else if(dir===border.DN||dir===border.RT){ pstr = ((type===parser.URL_PZPRV3 || !!bd.cell[id])?"h":"g");}
				else if(qnum===-2){ pstr = ".";}
				else if(qnum>= 0&&qnum< 16){ pstr = ""+ qnum.toString(16);}
				else if(qnum>=16&&qnum<256){ pstr = "-"+qnum.toString(16);}
				else{ count++;}
			}
			else{ count++;}

			if(count===0){ cm += pstr;}
			else if(pstr||count===18){ cm+=((17+count).toString(36)+pstr); count=0;}
		}
		if(count>0){ cm+=(17+count).toString(36);}

		this.outbstr += cm;
	}
},
//---------------------------------------------------------
FileIO:{
	decodeData : function(){
		this.decodeBorder( function(border,ca){
			if     (ca==="a"){ border.qdir = (border.isHorz()?border.UP:border.LT);}
			else if(ca==="b"){ border.qdir = (border.isHorz()?border.DN:border.RT);}
			else if(ca==="."){ border.qnum = -2;}
			else if(ca!=="0"){ border.qnum = +ca;}
		});
		this.decodeCellAnumsub();
	},
	encodeData : function(){
		this.encodeBorder( function(border){
			var dir=border.qdir;
			if     (dir===border.UP||dir===border.LT){ return "a ";}
			else if(dir===border.DN||dir===border.RT){ return "b ";}
			else if(border.qnum===-2){ return ". ";}
			else if(border.qnum!==-1){ return border.qnum+" ";}
			else                     { return "0 ";}
		});
		this.encodeCellAnumsub();
	}
},

//---------------------------------------------------------
// 正解判定処理実行部
AnsCheck:{
	checklist : [
		"checkDifferentNumberInLine",
		"checkSubOfNumber",
		"checkIneqMark",
		"checkNoNumCell+"
	],

	checkDifferentNumberInLine : function(){
		this.checkRowsCols(this.isDifferentNumberInClist, "nmDupRow");
	},
	checkSubOfNumber : function(){
		this.checkHintSideCell(function(border,a1,a2){
			return (border.qnum>0 && border.qnum!==Math.abs(a1-a2));
		}, "nmSubNe");
	},
	checkIneqMark : function(){
		this.checkHintSideCell(function(border,a1,a2){
			var mark = border.qdir;
			return !(mark===0 || ((mark===1||mark===3) && a1<a2) || ((mark===2||mark===4) && a1>a2));
		}, "nmIneqNe");
	},
	checkHintSideCell : function(func, code){
		var boardborder = this.board.border;
		for(var id=0;id<boardborder.length;id++){
			var border = boardborder[id], cell1 = border.sidecell[0], cell2 = border.sidecell[1];
			var num1 = cell1.getNum(), num2 = cell2.getNum();
			if(num1<=0 || num2<=0 || !func(border,num1,num2)){ continue;}
			
			this.failcode.add(code);
			if(this.checkOnly){ break;}
			cell1.seterr(1);
			cell2.seterr(1);
		}
	}
},

FailCode:{
	nmSubNe : ["丸付き数字とその両側の数字の差が一致していません。", "The Difference between two Adjacent cells is not equal to the number on circle."],
	nmIneqNe : ["不等号と数字が矛盾しています。", "A inequality sign is not correct."]
}
}));
