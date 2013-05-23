// Board.js v3.4.0
(function(){

var k = pzprv3.consts;
pzprv3.addConsts({
	// const値
	CELL   : 'cell',
	CROSS  : 'cross',
	BORDER : 'border',
	EXCELL : 'excell',

	QUES : 'ques',
	QNUM : 'qnum',
	QDIR : 'qdir',
	QANS : 'qans',
	ANUM : 'anum',
	LINE : 'line',
	QSUB : 'qsub',

	NDIR : 0,	// 方向なし
	UP   : 1,	// up
	DN   : 2,	// down
	LT   : 3,	// left
	RT   : 4,	// right
});

//---------------------------------------------------------------------------
// ★Boardクラス 盤面の情報を保持する。Cell, Cross, Borderのオブジェクトも保持する
//---------------------------------------------------------------------------
// Boardクラスの定義
pzprv3.createPuzzleClass('Board',
{
	initialize : function(){
		// 盤面の範囲
		this.minbx;
		this.minby;
		this.maxbx;
		this.maxby;

		// エラー設定可能状態かどうか
		this.diserror = 0;

		// エラー表示中かどうか
		this.haserror = false;

		this.cell   = this.owner.newInstance('CellList');
		this.cross  = this.owner.newInstance('CrossList');
		this.border = this.owner.newInstance('BorderList');
		this.excell = this.owner.newInstance('EXCellList');

		this.cellmax   = 0;	// セルの数
		this.crossmax  = 0;	// 交点の数
		this.bdmax     = 0;	// 境界線の数
		this.excellmax = 0;	// 拡張セルの数

		this.bdinside  = 0;	// 盤面の内側(外枠上でない)に存在する境界線の本数

		// 空オブジェクト
		this.nullobj = this.owner.newInstance('BoardPiece');
		this.emptycell   = this.owner.newInstance('Cell');
		this.emptycross  = this.owner.newInstance('Cross');
		this.emptyborder = this.owner.newInstance('Border');
		this.emptyexcell = this.owner.newInstance('EXCell');

		// 補助オブジェクト
		this.disrecinfo = 0;
		this.validinfo = {cell:[],border:[],line:[],all:[]};
		this.infolist = [];

		this.lines = this.addInfoList('LineManager');		// 線情報管理オブジェクト

		this.rooms = this.addInfoList('AreaRoomManager');		// 部屋情報を保持する
		this.linfo = this.addInfoList('AreaLineManager');		// 線つながり情報を保持する

		this.bcell = this.addInfoList('AreaBlackManager');	// 黒マス情報を保持する
		this.wcell = this.addInfoList('AreaWhiteManager');	// 白マス情報を保持する
		this.ncell = this.addInfoList('AreaNumberManager');	// 数字情報を保持する

		this.exec = this.owner.newInstance('BoardExec');
	},
	addInfoList : function(classname){
		var instance = this.owner.newInstance(classname);
		this.infolist.push(instance);
		return instance;
	},
	infolist : [],

	qcols : 10,		/* 盤面の横幅(デフォルト) */
	qrows : 10,		/* 盤面の縦幅(デフォルト) */

	iscross  : 0,	// 1:盤面内側のCrossがあるパズル 2:外枠上を含めてCrossがあるパズル
	isborder : 0,	// 1:Border/Lineが操作可能なパズル 2:外枠上も操作可能なパズル
	isexcell : 0,	// 1:上・左側にセルを用意するパズル 2:四方にセルを用意するパズル

	//---------------------------------------------------------------------------
	// bd.init()  オブジェクト生成後の処理
	//---------------------------------------------------------------------------
	init : function(){
		for(var i=0;i<this.infolist.length;i++){
			this.infolist[i].init();
		}
	},

	//---------------------------------------------------------------------------
	// bd.initBoardSize() 指定されたサイズで盤面の初期化を行う
	//---------------------------------------------------------------------------
	initBoardSize : function(col,row){
		if(col===(void 0)||isNaN(col)){ col=this.qcols; row=this.qrows;}

		this.allclear(false); // initGroupで、新Objectに対してはallclearが個別に呼ばれます

						   { this.initGroup(k.CELL,   col, row);}
		if(!!this.iscross) { this.initGroup(k.CROSS,  col, row);}
		if(!!this.isborder){ this.initGroup(k.BORDER, col, row);}
		if(!!this.isexcell){ this.initGroup(k.EXCELL, col, row);}

		this.qcols = col;
		this.qrows = row;

		this.setminmax();
		this.setposAll();

		this.resetInfo();

		this.owner.cursor.initCursor();
		this.owner.opemgr.allerase();
	},

	//---------------------------------------------------------------------------
	// bd.initGroup()     数を比較して、オブジェクトの追加か削除を行う
	// bd.getGroup()      指定したタイプのオブジェクト配列を返す
	// bd.estimateSize()  指定したオブジェクトがいくつになるか計算を行う
	// bd.newObject()     指定されたタイプの新しいオブジェクトを返す
	//---------------------------------------------------------------------------
	initGroup : function(type, col, row){
		var group = this.getGroup(type);
		var len = this.estimateSize(type, col, row), clen = group.length;
		// 既存のサイズより小さくなるならdeleteする
		if(clen>len){
			for(var id=clen-1;id>=len;id--){ group.pop();}
		}
		// 既存のサイズより大きくなるなら追加する
		else if(clen<len){
			for(var id=clen;id<len;id++){
				group.add(this.newObject(type));
				group[id].id = id;
				group[id].allclear(false);
			}
		}
		group.length = len;
		this.setposGroup(type);
		return (len-clen);
	},
	getGroup : function(type){
		if     (type===k.CELL)  { return this.cell;}
		else if(type===k.CROSS) { return this.cross;}
		else if(type===k.BORDER){ return this.border;}
		else if(type===k.EXCELL){ return this.excell;}
		return [];
	},
	estimateSize : function(type, col, row){
		if     (type===k.CELL)  { return col*row;}
		else if(type===k.CROSS) { return (col+1)*(row+1);}
		else if(type===k.BORDER){
			if     (this.isborder===1){ return 2*col*row-(col+row);}
			else if(this.isborder===2){ return 2*col*row+(col+row);}
		}
		else if(type===k.EXCELL){
			if     (this.isexcell===1){ return col+row+1;}
			else if(this.isexcell===2){ return 2*col+2*row+4;}
		}
		return 0;
	},
	newObject : function(type){
		if     (type===k.CELL)  { return this.owner.newInstance('Cell');}
		else if(type===k.CROSS) { return this.owner.newInstance('Cross');}
		else if(type===k.BORDER){ return this.owner.newInstance('Border');}
		else if(type===k.EXCELL){ return this.owner.newInstance('EXCell');}
		return this.nullobj;
	},
 
	//---------------------------------------------------------------------------
	// bd.setposAll()    全てのCell, Cross, BorderオブジェクトのsetposCell()等を呼び出す
	//                   盤面の新規作成や、拡大/縮小/回転/反転時などに呼び出される
	// bd.setposGroup()  指定されたタイプのsetpos関数を呼び出す
	// bd.setposCell()   該当するidのセルのbx,byプロパティを設定する
	// bd.setposCross()  該当するidの交差点のbx,byプロパティを設定する
	// bd.setposBorder() 該当するidの境界線/Lineのbx,byプロパティを設定する
	// bd.setposEXCell() 該当するidのExtendセルのbx,byプロパティを設定する
	// bd.set_xnum()     crossは存在しないが、bd._xnumだけ設定したい場合に呼び出す
	//---------------------------------------------------------------------------
	// setpos関連関数 <- 各Cell等が持っているとメモリを激しく消費するのでここに置くこと.
	setposAll : function(){
		this.setposCells();
		if(!!this.iscross) { this.setposCrosses();}
		if(!!this.isborder){ this.setposBorders();}
		if(!!this.isexcell){ this.setposEXcells();}

		this.latticemax = (this.qcols+1)*(this.qrows+1);
	},
	setposGroup : function(type){
		if     (type===k.CELL)  { this.setposCells();}
		else if(type===k.CROSS) { this.setposCrosses();}
		else if(type===k.BORDER){ this.setposBorders();}
		else if(type===k.EXCELL){ this.setposEXcells();}
	},

	setposCells : function(){
		var qc = this.qcols;
		this.cellmax = this.cell.length;
		for(var id=0;id<this.cellmax;id++){
			var obj = this.cell[id];
			obj.id = id;
			obj.isnull = false;

			obj.bx = (id%qc)*2+1;
			obj.by = ((id/qc)<<1)+1;
		}
	},
	setposCrosses : function(){
		var qc = this.qcols;
		this.crossmax = this.cross.length;
		for(var id=0;id<this.crossmax;id++){
			var obj = this.cross[id];
			obj.id = id;
			obj.isnull = false;

			obj.bx = (id%(qc+1))*2;
			obj.by = (id/(qc+1))<<1;
		}
	},
	setposBorders : function(){
		var qc = this.qcols, qr = this.qrows;
		this.bdinside = 2*qc*qr-(qc+qr);
		this.bdmax = this.border.length;
		for(var id=0;id<this.bdmax;id++){
			var obj=this.border[id], i=id;
			obj.id = id;
			obj.isnull = false;

			if(i>=0 && i<(qc-1)*qr){ obj.bx=(i%(qc-1))*2+2; obj.by=((i/(qc-1))<<1)+1;} i-=((qc-1)*qr);
			if(i>=0 && i<qc*(qr-1)){ obj.bx=(i%qc)*2+1;     obj.by=((i/qc)<<1)+2;    } i-=(qc*(qr-1));
			if(this.isborder===2){
				if(i>=0 && i<qc){ obj.bx=i*2+1; obj.by=0;    } i-=qc;
				if(i>=0 && i<qc){ obj.bx=i*2+1; obj.by=2*qr; } i-=qc;
				if(i>=0 && i<qr){ obj.bx=0;     obj.by=i*2+1;} i-=qr;
				if(i>=0 && i<qr){ obj.bx=2*qc;  obj.by=i*2+1;} i-=qr;
			}
			obj.isvert = !(obj.bx&1);

			if(obj.isvert){
				obj.sidecell[0] = obj.relcell(-1,0);
				obj.sidecell[1] = obj.relcell( 1,0);
				obj.sidecross[0] = obj.relcross(0,-1);
				obj.sidecross[1] = obj.relcross(0, 1);
			}
			else{
				obj.sidecell[0] = obj.relcell(0,-1);
				obj.sidecell[1] = obj.relcell(0, 1);
				obj.sidecross[0] = obj.relcross(-1,0);
				obj.sidecross[1] = obj.relcross( 1,0);
			}
			// LineManager用
			obj.lineedge = (!this.lines.borderAsLine ? obj.sidecell : obj.sidecross);
		}
	},
	setposEXcells : function(){
		var qc = this.qcols, qr = this.qrows;
		this.excellmax = this.excell.length;
		for(var id=0;id<this.excellmax;id++){
			var obj = this.excell[id], i=id;
			obj.id = id;
			obj.isnull = false;

			if(this.isexcell===1){
				if(i>=0 && i<qc){ obj.bx=i*2+1; obj.by=-1;   } i-=qc;
				if(i>=0 && i<qr){ obj.bx=-1;    obj.by=i*2+1;} i-=qr;
				if(i===0)       { obj.bx=-1;    obj.by=-1;   } i--;
			}
			else if(this.isexcell===2){
				if(i>=0 && i<qc){ obj.bx=i*2+1;  obj.by=-1;    } i-=qc;
				if(i>=0 && i<qc){ obj.bx=i*2+1;  obj.by=2*qr+1;} i-=qc;
				if(i>=0 && i<qr){ obj.bx=-1;     obj.by=i*2+1; } i-=qr;
				if(i>=0 && i<qr){ obj.bx=2*qc+1; obj.by=i*2+1; } i-=qr;
				if(i===0)       { obj.bx=-1;     obj.by=-1;    } i--;
				if(i===0)       { obj.bx=2*qc+1; obj.by=-1;    } i--;
				if(i===0)       { obj.bx=-1;     obj.by=2*qr+1;} i--;
				if(i===0)       { obj.bx=2*qc+1; obj.by=2*qr+1;} i--;
			}
		}
	},

	//---------------------------------------------------------------------------
	// bd.setminmax()   盤面のbx,byの最小値/最大値をセットする
	//---------------------------------------------------------------------------
	setminmax : function(){
		var extUL = (this.isexcell===1 || this.isexcell===2);
		var extDR = (this.isexcell===2);
		this.minbx = (!extUL ? 0 : -2);
		this.minby = (!extUL ? 0 : -2);
		this.maxbx = (!extDR ? 2*this.qcols : 2*this.qcols+2);
		this.maxby = (!extDR ? 2*this.qrows : 2*this.qrows+2);

		this.owner.cursor.setminmax();
	},

	//---------------------------------------------------------------------------
	// bd.allclear() 全てのCell, Cross, Borderオブジェクトのallclear()を呼び出す
	// bd.ansclear() 全てのCell, Cross, Borderオブジェクトのansclear()を呼び出す
	// bd.subclear() 全てのCell, Cross, Borderオブジェクトのsubclear()を呼び出す
	// bd.errclear() 全てのCell, Cross, Borderオブジェクトのerrorプロパティを0にして、Canvasを再描画する
	//---------------------------------------------------------------------------
	// 呼び出し元：this.initBoardSize()
	allclear : function(isrec){
		for(var i=0;i<this.cellmax  ;i++){ this.cell[i].allclear(isrec);}
		for(var i=0;i<this.crossmax ;i++){ this.cross[i].allclear(isrec);}
		for(var i=0;i<this.bdmax    ;i++){ this.border[i].allclear(isrec);}
		for(var i=0;i<this.excellmax;i++){ this.excell[i].allclear(isrec);}
	},
	// 呼び出し元：回答消去ボタン押した時
	ansclear : function(){
		this.owner.opemgr.newOperation(true);
		for(var i=0;i<this.cellmax  ;i++){ this.cell[i].ansclear();}
		for(var i=0;i<this.crossmax ;i++){ this.cross[i].ansclear();}
		for(var i=0;i<this.bdmax    ;i++){ this.border[i].ansclear();}
		for(var i=0;i<this.excellmax;i++){ this.excell[i].ansclear();}
	},
	// 呼び出し元：補助消去ボタン押した時
	subclear : function(){
		this.owner.opemgr.newOperation(true);
		for(var i=0;i<this.cellmax  ;i++){ this.cell[i].subclear();}
		for(var i=0;i<this.crossmax ;i++){ this.cross[i].subclear();}
		for(var i=0;i<this.bdmax    ;i++){ this.border[i].subclear();}
		for(var i=0;i<this.excellmax;i++){ this.excell[i].subclear();}
	},

	errclear : function(isrepaint){
		if(!this.haserror){ return;}

		for(var i=0;i<this.cellmax  ;i++){ this.cell[i].error=0;}
		for(var i=0;i<this.crossmax ;i++){ this.cross[i].error=0;}
		for(var i=0;i<this.bdmax    ;i++){ this.border[i].error=0;}
		for(var i=0;i<this.excellmax;i++){ this.excell[i].error=0;}

		this.haserror = false;
		if(isrepaint!==false){ this.owner.redraw();}
	},

	//---------------------------------------------------------------------------
	// bd.getObjectPos()  (X,Y)の位置にあるオブジェクトを、盤面の大きさを(qc×qr)で計算して返す
	//---------------------------------------------------------------------------
	getObjectPos : function(type,bx,by,qc,qr){
		if     (type===k.CELL)  { return this.getc(bx,by,qc,qr);}
		else if(type===k.CROSS) { return this.getx(bx,by,qc,qr);}
		else if(type===k.BORDER){ return this.getb(bx,by,qc,qr);}
		else if(type===k.EXCELL){ return this.getex(bx,by,qc,qr);}
		return null;
	},

	//---------------------------------------------------------------------------
	// bd.getc()  (X,Y)の位置にあるCellオブジェクトを、盤面の大きさを(qc×qr)で計算して返す
	// bd.getx()  (X,Y)の位置にあるCrossオブジェクトを、盤面の大きさを(qc×qr)で計算して返す
	// bd.getb()  (X,Y)の位置にあるBorderオブジェクトを、盤面の大きさを(qc×qr)で計算して返す
	// bd.getex() (X,Y)の位置にあるextendCellオブジェクトを、盤面の大きさを(qc×qr)で計算して返す
	// bd.getobj() (X,Y)の位置にある何らかのオブジェクトを、盤面の大きさを(qc×qr)で計算して返す
	//---------------------------------------------------------------------------
	getc : function(bx,by,qc,qr){
		var id = null;
		if(qc===(void 0)){ qc=this.qcols; qr=this.qrows;}
		if((bx<0||bx>(qc<<1)||by<0||by>(qr<<1))||(!(bx&1))||(!(by&1))){ }
		else{ id = (bx>>1)+(by>>1)*qc;}

		return (id!==null ? this.cell[id] : this.emptycell);
	},
	getx : function(bx,by,qc,qr){
		var id = null, cross = this.emptycross;
		if(qc===(void 0)){ qc=this.qcols; qr=this.qrows;}
		if((bx<0||bx>(qc<<1)||by<0||by>(qr<<1))||(!!(bx&1))||(!!(by&1))){ }
		else{ id = (bx>>1)+(by>>1)*(qc+1);}

		if(this.iscross!==0 && id!==null){ cross = this.cross[id];}
		else{
			if(this.iscross===0){
				/* LineManager用 */
				cross = this.newObject(k.CROSS);
				cross.id = id
				cross.isnull = false;
				cross.bx = bx;
				cross.by = by;
			}
		}
		return cross;
	},
	getb : function(bx,by,qc,qr){
		var id = null;
		if(qc===(void 0)){ qc=this.qcols; qr=this.qrows;}
		if(bx>=1&&bx<=2*qc-1&&by>=1&&by<=2*qr-1){
			if     (!(bx&1) &&  (by&1)){ id = ((bx>>1)-1)+(by>>1)*(qc-1);}
			else if( (bx&1) && !(by&1)){ id = (bx>>1)+((by>>1)-1)*qc+(qc-1)*qr;}
		}
		else if(this.isborder===2){
			if     (by===0   &&(bx&1)&&(bx>=1&&bx<=2*qc-1)){ id = (qc-1)*qr+qc*(qr-1)+(bx>>1);}
			else if(by===2*qr&&(bx&1)&&(bx>=1&&bx<=2*qc-1)){ id = (qc-1)*qr+qc*(qr-1)+qc+(bx>>1);}
			else if(bx===0   &&(by&1)&&(by>=1&&by<=2*qr-1)){ id = (qc-1)*qr+qc*(qr-1)+2*qc+(by>>1);}
			else if(bx===2*qc&&(by&1)&&(by>=1&&by<=2*qr-1)){ id = (qc-1)*qr+qc*(qr-1)+2*qc+qr+(by>>1);}
		}

		return (id!==null ? this.border[id] : this.emptyborder);
	},
	getex : function(bx,by,qc,qr){
		var id = null;
		if(qc===(void 0)){ qc=this.qcols; qr=this.qrows;}
		if(this.isexcell===1){
			if(bx===-1&&by===-1){ id = qc+qr;}
			else if(by===-1&&bx>0&&bx<2*qc){ id = (bx>>1);}
			else if(bx===-1&&by>0&&by<2*qr){ id = qc+(by>>1);}
		}
		else if(this.isexcell===2){
			if     (by===-1    &&bx>0&&bx<2*qc){ id = (bx>>1);}
			else if(by===2*qr+1&&bx>0&&bx<2*qc){ id = qc+(bx>>1);}
			else if(bx===-1    &&by>0&&by<2*qr){ id = 2*qc+(by>>1);}
			else if(bx===2*qc+1&&by>0&&by<2*qr){ id = 2*qc+qr+(by>>1);}
			else if(bx===-1    &&by===-1    ){ id = 2*qc+2*qr;}
			else if(bx===2*qc+1&&by===-1    ){ id = 2*qc+2*qr+1;}
			else if(bx===-1    &&by===2*qr+1){ id = 2*qc+2*qr+2;}
			else if(bx===2*qc+1&&by===2*qr+1){ id = 2*qc+2*qr+3;}
		}

		return (id!==null ? this.excell[id] : this.emptyexcell);
	},

	getobj : function(bx,by,qc,qr){
		if     ((bx+by)&1)       { return this.getb(bx,by,qc,qr);}
		else if(!(bx&1)&&!(by&1)){ return this.getx(bx,by,qc,qr);}

		var cell = this.getc(bx,by,qc,qr);
		return (!cell.isnull?cell:this.getex(bx,by,qc,qr));
	},

	//---------------------------------------------------------------------------
	// bd.objectinside() 座標(x1,y1)-(x2,y2)に含まれるオブジェクトのリストを取得する
	//---------------------------------------------------------------------------
	objectinside : function(type,x1,y1,x2,y2){
		if     (type===k.CELL)  { return this.cellinside  (x1,y1,x2,y2);}
		else if(type===k.CROSS) { return this.crossinside (x1,y1,x2,y2);}
		else if(type===k.BORDER){ return this.borderinside(x1,y1,x2,y2);}
		else if(type===k.EXCELL){ return this.excellinside(x1,y1,x2,y2);}
		return [];
	},

	//---------------------------------------------------------------------------
	// bd.cellinside()   座標(x1,y1)-(x2,y2)に含まれるCellのリストを取得する
	// bd.crossinside()  座標(x1,y1)-(x2,y2)に含まれるCrossのリストを取得する
	// bd.borderinside() 座標(x1,y1)-(x2,y2)に含まれるBorderのリストを取得する
	// bd.excellinside() 座標(x1,y1)-(x2,y2)に含まれるExcellのリストを取得する
	//---------------------------------------------------------------------------
	cellinside : function(x1,y1,x2,y2){
		var clist = this.owner.newInstance('CellList');
		for(var by=(y1|1);by<=y2;by+=2){ for(var bx=(x1|1);bx<=x2;bx+=2){
			var cell = this.getc(bx,by);
			if(!cell.isnull){ clist.add(cell);}
		}}
		return clist;
	},
	crossinside : function(x1,y1,x2,y2){
		var clist = this.owner.newInstance('CrossList');
		for(var by=y1+(y1&1);by<=y2;by+=2){ for(var bx=x1+(x1&1);bx<=x2;bx+=2){
			var cross = this.getx(bx,by);
			if(!cross.isnull){ clist.add(cross);}
		}}
		return clist;
	},
	borderinside : function(x1,y1,x2,y2){
		var blist = this.owner.newInstance('BorderList');
		for(var by=y1;by<=y2;by++){ for(var bx=x1+(((x1+by)&1)^1);bx<=x2;bx+=2){
			var border = this.getb(bx,by);
			if(!border.isnull){ blist.add(border);}
		}}
		return blist;
	},
	excellinside : function(x1,y1,x2,y2){
		var exlist = this.owner.newInstance('EXCellList');
		for(var by=(y1|1);by<=y2;by+=2){ for(var bx=(x1|1);bx<=x2;bx+=2){
			var excell = this.getex(bx,by);
			if(!excell.isnull){ exlist.add(excell);}
		}}
		return exlist;
	},

	//---------------------------------------------------------------------------
	// bd.disableInfo()  Area/LineManagerへの登録を禁止する
	// bd.enableInfo()   Area/LineManagerへの登録を許可する
	// bd.isenableInfo() 操作の登録できるかを返す
	//---------------------------------------------------------------------------
	disableInfo : function(){
		this.owner.opemgr.disableRecord();
		this.disrecinfo++;
	},
	enableInfo : function(){
		this.owner.opemgr.enableRecord();
		if(this.disrecinfo>0){ this.disrecinfo--;}
	},
	isenableInfo : function(){
		return (this.disrecinfo===0);
	},

	//--------------------------------------------------------------------------------
	// bd.resetInfo()        部屋、黒マス、白マスの情報をresetする
	// bd.setCellInfoAll()   黒マス・白マスが入力されたり消された時に、黒マス/白マスIDの情報を変更する
	// bd.setBorderInfoAll() 境界線が引かれたり消されてたりした時に、部屋情報を更新する
	// bd.setLineInfoAll()   線が引かれたり消されてたりした時に、線情報を更新する
	//--------------------------------------------------------------------------------
	resetInfo : function(){
		for(var i=0,len=this.validinfo.all.length;i<len;i++)
			{ this.validinfo.all[i].reset();}
	},
	setCellInfoAll : function(cell){
		if(!this.isenableInfo()){ return;}
		for(var i=0,len=this.validinfo.cell.length;i<len;i++)
			{ this.validinfo.cell[i].setCellInfo(cell);}
	},
	setBorderInfoAll : function(border){
		if(!this.isenableInfo()){ return;}
		for(var i=0,len=this.validinfo.border.length;i<len;i++)
			{ this.validinfo.border[i].setBorderInfo(border);}
	},
	setLineInfoAll : function(border){
		if(!this.isenableInfo()){ return;}
		for(var i=0,len=this.validinfo.line.length;i<len;i++)
			{ this.validinfo.line[i].setLineInfo(border);}
	},

	//---------------------------------------------------------------------------
	// bd.irowakeRemake() 「色分けしなおす」ボタンを押した時などに色分けしなおす
	//---------------------------------------------------------------------------
	irowakeRemake : function(){
		this.lines.newIrowake();
	},

	//--------------------------------------------------------------------------------
	// bd.getLineInfo()  線情報をAreaInfo型のオブジェクトで返す
	// bd.getRoomInfo()  部屋情報をAreaInfo型のオブジェクトで返す
	// bd.getLareaInfo() 線つながり情報をAreaInfo型のオブジェクトで返す
	// bd.getBCellInfo() 黒マス情報をAreaInfo型のオブジェクトで返す
	// bd.getWCellInfo() 白マス情報をAreaInfo型のオブジェクトで返す
	// bd.getNumberInfo() 数字情報をAreaInfo型のオブジェクトで返す
	//--------------------------------------------------------------------------------
	getLineInfo  : function(){ return this.lines.getLineInfo();},
	getRoomInfo  : function(){ return this.rooms.getAreaInfo();},
	getLareaInfo : function(){ return this.linfo.getAreaInfo();},
	getBCellInfo : function(){ return this.bcell.getAreaInfo();},
	getWCellInfo : function(){ return this.wcell.getAreaInfo();},
	getNumberInfo : function(){ return this.ncell.getAreaInfo();},

	//---------------------------------------------------------------------------
	// bd.disableSetError()  盤面のオブジェクトにエラーフラグを設定できないようにする
	// bd.enableSetError()   盤面のオブジェクトにエラーフラグを設定できるようにする
	// bd.isenableSetError() 盤面のオブジェクトにエラーフラグを設定できるかどうかを返す
	//---------------------------------------------------------------------------
	disableSetError  : function(){ this.diserror++;},
	enableSetError   : function(){ this.diserror--;},
	isenableSetError : function(){ return (this.diserror<=0); },

	//---------------------------------------------------------------------------
	// bd.searchMovedPosition() 丸数字を移動させるパズルで、移動後の場所を設定する
	//---------------------------------------------------------------------------
	searchMovedPosition : function(linfo){
		for(var c=0;c<this.cellmax;c++){
			var cell = this.cell[c];
			cell.base = (cell.isNum() ? cell : this.emptycell);
		}
		for(var r=1;r<=linfo.max;r++){
			var clist = linfo.getclist(r);
			if(clist.length<=1){ continue;}
			var before=null, after=null;
			for(var i=0;i<clist.length;i++){
				var cell=clist[i];
				if(cell.lcnt()===1){
					if(cell.isNum()){ before=cell;}else{ after=cell;}
				}
			}
			if(before!==null && after!==null){
				before.base = this.emptycell;
				after.base = before;
			}
		}
	},

	//---------------------------------------------------------------------------
	// bd.setCrossBorderError() ある交点とその周り四方向にエラーフラグを設定する
	//---------------------------------------------------------------------------
	setCrossBorderError : function(bx,by){
		if(this.iscross!==0){ this.getx(bx,by).seterr(1);}
		this.borderinside(bx-1,by-1,bx+1,by+1).seterr(1);
	}
});

//----------------------------------------------------------------------------
// ★Pointクラス  (px,py)pixel座標を扱う
//---------------------------------------------------------------------------
// Pointクラス
pzprv3.createPuzzleClass('Point',
{
	initialize : function(px,py){ this.px = px; this.py = py;},
	set : function(point){ this.px = point.px; this.py = point.py;},
	reset : function(){ this.px = null; this.py = null;},
	valid : function(){ return (this.px!==null && this.py!==null);}
});

})();
