sap.ui.define([
    "zcostgroup/controller/BaseController",
    "sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/odata/v2/ODataModel",
    "sap/ui/model/resource/ResourceModel",
	"sap/ui/export/Spreadsheet",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/m/SearchField",
	"sap/m/Button",
	"sap/m/Dialog",
    "zcostgroup/sheetjs/jszip",
	"zcostgroup/sheetjs/xlsx.full.min"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Sorter, Filter, FilterOperator, JSONModel, ODataModel, ResourceModel, Spreadsheet, MessageToast, MessageBox, SearchField, Button, Dialog) {
        "use strict";

        var _vFlg = true;
        var _vCnt;
        var _oModelMain;
        var _oDataList = {};
        var _oLayout;
        var _oTable;
        var _oViewTableModel;
        var _i18n;

        return Controller.extend("zcostgroup.controller.Main", {

            onInit: function () {
                
                var oView = this.getView();
                this.setInitPage(oView);

            },

            /**
             * 화면설정초기화
             * @param {*} oView 
             */
            setInitPage : function(oView){
                
                //i18n
                _i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle();               
                
                //view.xml table id
                _oTable = oView.byId("iCOSTGROUPList");
                
                //view.xml table row path model
                _oViewTableModel = this._createJSONModel(oView,"oZCOSTGROUP");
                _oViewTableModel.setProperty("/", []);
                
                //view.xml Page layout
                _oLayout = this._createJSONModel(oView,"oLayout");
                _oLayout.setData({
                    "tableCnt": 0,
                    "uploaderVisible": false,
                    "exportVisible": false,
                    "excelUploadSave": false
                });

                //main model
                _oModelMain = this._setCustomModel(_oDataList, oView, "oMODELMAIN", "/sap/opu/odata/sap/YY1_ZCOSTGROUP_CDS/", "/YY1_ZCOSTGROUP", "ODataModel");

                //조회시 코드값 텍스트 리스트
                this._setCustomModel(_oDataList, oView, "oCOMPANYCODE_VH", "/sap/opu/odata/sap/YY1_ZCOSTGROUP_WBS_CDS/", "/I_CompanyCodeStdVH", "ODataModel");

                //value help list
                var oCOMPANYCODE = this._setCustomModel(_oDataList, oView, "oCOMPANYCODE", "/sap/opu/odata/sap/API_COMPANYCODE_SRV/", "/A_CompanyCode", "JSONModel");

                //코드성 데이터 Read 
                var sSorter = [
                    new Sorter("CompanyCode")
                ]
                $.when(     
                    this._getODataModelRead(_oDataList["oCOMPANYCODE"])
                ).done(function(oResults){
                    oCOMPANYCODE.setProperty("/", oResults);
                });
                
            },

            /**
             * 조회
             * @param {*} vEvent 
             */
            onSearch : function(vEvent){
              
                var self = this;
                if(!_oTable.isBusy()){
                    _oTable.setBusy(true);
                }
                
                var aFilter = this._getSearchFilter();	

                $.when(     
                    this._getODataModelRead(_oDataList["oMODELMAIN"],aFilter),
                    this._getODataModelRead(_oDataList["oCOMPANYCODE_VH"])
                ).done(function(oResults,oVHCC){
                    
                    if(!oResults.length) { // 데이터가 없거나 각 이벤트 로직 탄 후 조회했을 경우
                        _oTable.setSelectedIndex(-1);
                        _oViewTableModel.setProperty("/", oResults);
                        _oLayout.setProperty("/tableCnt", oResults.length);
                        _oTable.setBusy(false);
                        if(!vEvent) MessageToast.show(_i18n.getText("MSG_RESULT_NULL"));
                        if(vEvent === "DELETE") MessageToast.show(_i18n.getText("MSG_RESULT_DELETE"));
                        return;
                    }

                    //코드, 명 매칭
                    oResults = self._setValueHelpName(oResults,oVHCC,"COMPANYCODE","CompanyCode","COMPANYNAME","CompanyCodeName");
                    
                    _oTable.setSelectedIndex(-1);
                    _oViewTableModel.setProperty("/", oResults);
                    _oLayout.setProperty("/tableCnt", oResults.length);
                    _oLayout.setProperty("/uploaderVisible", false);
                    _oLayout.setProperty("/exportVisible", true);
                    _oLayout.setProperty("/excelUploadSave", false);
                    _oTable.setBusy(false);

                    var sKey = "MSG_RESULT_SELECT";
                    switch (vEvent) {
                        case "SAVE" :
                            sKey = "MSG_RESULT_UPDATE"; 
                            break;
                        case "DELETE" :
                            sKey = "MSG_RESULT_DELETE";
                            break;
                        case "NULL" :
                            sKey = "";
                            break;
                    }
                    if(sKey !== ""){
                        MessageToast.show(_i18n.getText(sKey));
                    }

                });

            },

            /**
             * 저장 전처리 필수값 체크 및 엑셀업로드 여부에 따른 로직분개
             * @returns 
             */
            onPreSave : async function(){

                var self = this, vCount = 0, aSelectedRows = self._getSelectedRow(_oViewTableModel, _oTable);
                
                
                // 선택한 데이터가 없을 때
                if(!aSelectedRows.length) { 
                    return MessageToast.show(_i18n.getText("MSG_CHECK_NULL"));
                }
                
                //테이블 필드 필수값 체크
                for(var i = 0; i <aSelectedRows.length; i++){
                    var item = aSelectedRows[i];
                    if(!item.COMPANYCODE) return MessageToast.show(_i18n.getText("COMPANYCODE")+_i18n.getText("MSG_PK_CHECK"));
                    if(!item.COSTGROUP) return MessageToast.show(_i18n.getText("COSTGROUP")+_i18n.getText("MSG_PK_CHECK"));
                }

                // 엑셀업로드 저장시 기존 데이터 모두 삭제후 insert
                if(_oLayout.getProperty("/excelUploadSave")){

                    MessageBox.confirm(_i18n.getText("MSG_EXCEL_WARNING"), {
                        actions: ["Confirm", sap.m.MessageBox.Action.CANCEL],
                        styleClass: "sapUiSizeCompact",
                        onClose: function(sAction) {
                            if(sAction === "Confirm"){
                                this.excelDataSave(aSelectedRows);
                            }
                        }.bind(self)
                    });
                }else{
                    self.onSavePk();
                }
            },

            /**
             * 엑셀업로드 저장시 기존 데이터 일괄 삭제 후 저장처리
             * @param {*} aSelectedRows 
             */
            excelDataSave: function (aSelectedRows) {
                
                _oTable.setBusy(true);
                var self = this;
              
                self._getODataModelRead(_oDataList["oMODELMAIN"]).done(function (aDataArr) {
                    var aDeleteCallArr = aDataArr.map(function (item) {
                        return self._getODataDelete(_oDataList["oMODELMAIN"], _oDataList["oMODELMAIN"].oEntitySet + "(guid'" + item.SAP_UUID + "')");
                    }.bind(self));
              
                    Promise.all(aDeleteCallArr).then(function () {
                        var aCallCBO = [];
                        aSelectedRows.forEach(function (item) {
                            var oData = {};
                            oData.COMPANYCODE = item.COMPANYCODE;
                            oData.COSTGROUP = item.COSTGROUP;
                            oData.COSTGROUPTEXT = item.COSTGROUPTEXT || "";
                            oData.USEYN = item.USEYN;
                            aCallCBO.push(self._getODataCreate(_oDataList["oMODELMAIN"], _oDataList["oMODELMAIN"].oEntitySet, oData));
                        }.bind(self));
                
                        return Promise.all(aCallCBO);
                    })
                    .then(function () {
                        self.onSearch("SAVE");
                    });
                });
            },

            /**
             * 신규 및 수정에 대한 적합성 체크 및 저장
             */
            onSavePk : function(){
                var self = this, vCount = 0, aSelectedRows = self._getSelectedRow(_oViewTableModel, _oTable);
                
                _oTable.setBusy(true);
                
                _vCnt = aSelectedRows.length;
                var aCallCBOERROR = [];

                aSelectedRows.forEach(function (item) {
                    
                    var aCallCBO = [];
                    var oData = {};
                    oData.COMPANYCODE = item.COMPANYCODE;
                    oData.COSTGROUP = item.COSTGROUP;
                    oData.COSTGROUPTEXT = item.COSTGROUPTEXT || "";
                    oData.USEYN = item.USEYN;
                    if(item.SAP_UUID){
                        aCallCBO.push(self._getODataUpdate(_oDataList["oMODELMAIN"], _oDataList["oMODELMAIN"].oEntitySet + "(guid'" + item.SAP_UUID + "')", oData));
                    }else{
                        var aFilter = [
                            new Filter("COMPANYCODE", "EQ", item.COMPANYCODE),
                            new Filter("COSTGROUP", "EQ", item.COSTGROUP)
                        ];
        
                        self._getODataModelRead(_oDataList["oMODELMAIN"], aFilter).done(function (aDataArr) {

                            if(!aDataArr.length){
                                aCallCBO.push(self._getODataCreate(_oDataList["oMODELMAIN"], _oDataList["oMODELMAIN"].oEntitySet, oData));
                            }

                            var aCallArr = aDataArr.map(function (item) {
                                if(aDataArr.length){
                                    aCallCBOERROR.push(item);
                                    aCallCBO.push(item);
                                }
                            }.bind(this));
                            
                            $.when.apply($, aCallArr).done(function () {
                                $.when.apply($, aCallCBO).done(function () {
                                    vCount++;
                                    if(_vCnt == vCount){
                                        self.onSaveResult(aCallCBOERROR);
                                    }
                                    console.log("1:"+item);
                                });
                            });
                        }.bind(this));
                    }
                    $.when.apply($,  aCallCBO).done(function(){
                        
                        if(aCallCBO.length){
                            aCallCBO.forEach(function (item) {
                                vCount++;
                                if(_vCnt == vCount){
                                    self.onSaveResult(aCallCBOERROR);
                                }
                            });
                        }
                    });
                });
            },

            /**
             * 저장 메세지 처리
             * @param {*} aCallCBOERROR 
             * @returns 
             */
            onSaveResult : function(aCallCBOERROR){

                _oTable.setBusy(false);

                var returnMsg = "";
                aCallCBOERROR.forEach(function (item, idx) {
                    if(idx === 0){
                        returnMsg = _i18n.getText("COSTGROUP") + " : " + item.COSTGROUP;
                    }else{
                        returnMsg = returnMsg + "\n" + _i18n.getText("COSTGROUP") + " : " + item.COSTGROUP;
                    }
                });
                if(_vCnt === aCallCBOERROR.length){
                    returnMsg = returnMsg + "\n\n" + _i18n.getText("MSG_PK_VALUE");
                    this._showMessage(returnMsg);
                    return;
                }

                if(aCallCBOERROR.length){
                    returnMsg = returnMsg + "\n\n" + _i18n.getText("MSG_PK_VALUE");
                    returnMsg = returnMsg + "\n\n" + (_vCnt-aCallCBOERROR.length) + _i18n.getText("MSG_RESULT_UPDATE_CNT");
                    this._showMessage(returnMsg);
                    this.onSearch("NULL");
                }else{
                    this.onSearch("SAVE");
                }
            },    

            /**
             * 저장
             * @returns 
             */
            onSave : function(){

                var self = this, vCount = 0, aSelectedRows = self._getSelectedRow(_oViewTableModel, _oTable);

                MessageBox.confirm(_i18n.getText("MSG_CHECK_UPDATE"), {
                    actions: ["Confirm", sap.m.MessageBox.Action.CANCEL],
                    styleClass: "sapUiSizeCompact",
                    onClose: function(sAction) {
                        if(sAction === "Confirm"){

                            _oTable.setBusy(true);

                            aSelectedRows.forEach(function (item) {

                                var oData = {};
                                oData.COMPANYCODE = item.COMPANYCODE;    
                                oData.COSTGROUP = item.COSTGROUP;
                                oData.COSTGROUPTEXT = item.COSTGROUPTEXT || "";
                                oData.USEYN = item.USEYN;
            
                                //신규저장
                                if(item.editRow === true){
                                    _oModelMain.create(_oDataList["oMODELMAIN"].oEntitySet, oData, {
                                        success: function(oReturn) {
                                            vCount++;
                                            if(aSelectedRows.length === vCount) {
                                                self.onSearch("SAVE");
                                            }
                                        },
                                        error: function(oError) {
                                            if(oError.responseText){
                                                var oResponseTextData = JSON.parse(oError.responseText);
                                                MessageToast.show(oResponseTextData.error.message.value);
                                            }else{
                                                MessageToast.show(oError.statusText);	
                                            }
                                            _oTable.setBusy(false);
                                        }
                                    });
                                //수정
                                }else{
                                    _oModelMain.update(_oDataList["oMODELMAIN"].oEntitySet+"(guid'"+ item.SAP_UUID +"')", oData, {
                                        success: function(oReturn) {
                                            vCount++;
                                            if(aSelectedRows.length === vCount) {
                                                self.onSearch("SAVE");
                                            }
                                        },
                                        error: function(oError) {
                                            if(oError.responseText){
                                                var oResponseTextData = JSON.parse(oError.responseText);
                                                MessageToast.show(oResponseTextData.error.message.value);
                                            }else{
                                                MessageToast.show(oError.statusText);	
                                            }
                                            _oTable.setBusy(false);
                                        }
                                    });
                                }
                            }.bind(this));
                        }
                    }.bind(this)
                });
            },

            /**
             * 삭제전 신규데이터 확인
             */
            onPreDelete : function(){

                var self = this, vCountTrue = 0, vCountTotal = 0, aSelectedRows = this._getSelectedRow(_oViewTableModel, _oTable);
                var oView = this.getView();

                // 선택한 데이터가 없을 때
                if(!aSelectedRows.length) { 
                    return MessageToast.show(_i18n.getText("MSG_CHECK_NULL"));
                }

                // 테이블 데이터 로우 카운트
                _oViewTableModel.oData.forEach(function(item, idx) {
                    if(item.editRow){
                        vCountTrue++;
                    } 
                    vCountTotal++;
                });

                // 실데이터가 없을 경우
                if(vCountTotal === vCountTrue){

                    var _oViewTableModelCopy = this._createJSONModel(oView,"oZCOSTGROUPCOPY");
                    _oViewTableModelCopy.setProperty("/", []);

                    var vRowIndex = aSelectedRows.map(function(item, idx) {
                        return item.rowIndex;
                    });

                    _oViewTableModel.oData.forEach(function(item, idx) {
                        if(vRowIndex.indexOf(idx) === -1){
                            _oViewTableModelCopy.oData.push(item);
                        }
                    });

                    _oViewTableModel.setProperty("/", []);
                    _oTable.setSelectedIndex(-1);
                    _oViewTableModel.setProperty("/", _oViewTableModelCopy.oData);

                    return;
                }

                // 저장되지 않은 신규데이터가 존재할경우
                if(vCountTrue > 0){
                    MessageBox.confirm(_i18n.getText("MSG_CHECK_NEWDATA"), {
                        actions: ["Confirm", sap.m.MessageBox.Action.CANCEL],
                        styleClass: "sapUiSizeCompact",
                        onClose: function(sAction) {
                            if(sAction === "Confirm"){
                                self.onDeleteRow();
                            }
                        }.bind(this)
                    });
                }else{
                    self.onDeleteRow();
                }

            },

            /**
             * 삭제
             * @returns 
             */
            onDeleteRow : function(){
                var self = this, vCount = 0, aSelectedRows = this._getSelectedRow(_oViewTableModel, _oTable), vTotalCount = aSelectedRows.length;

                MessageBox.confirm(_i18n.getText("MSG_CHECK_DELETE"), {
                    actions: ["Confirm", sap.m.MessageBox.Action.CANCEL],
                    styleClass: "sapUiSizeCompact",
                    onClose: function(sAction) {
                        if(sAction === "Confirm"){

                            _oTable.setBusy(true);
                            
                            aSelectedRows.forEach(function(item, idx) {
                                if(item.SAP_UUID){
                                    _oModelMain.remove(_oDataList["oMODELMAIN"].oEntitySet+"(guid'"+ item.SAP_UUID +"')", {
                                        success: function(oReturn) {
                                            vCount++;
                                            if(vTotalCount === vCount) {
                                                self.onSearch("DELETE");
                                            }
                                        },
                                        error: function(oError) {
                                            if(oError.responseText){
                                                var oResponseTextData = JSON.parse(oError.responseText);
                                                MessageToast.show(oResponseTextData.error.message.value);
                                            }else{
                                                MessageToast.show(oError.statusText);	
                                            }
                                            _oTable.setBusy(false);
                                        }
                                    });
                                }else{
                                    vTotalCount--;
                                    if(vTotalCount === 0) self.onSearch("DELETE");
                                }
                            });
                        }
                    }.bind(this)
                });
            },

            /**
             * 추가
             */
            onInsertRow : function() { 
                var oModelDatas = _oViewTableModel.getProperty("/");
                var itemData = 
                {
                    COMPANYCODE : "",
                    COSTGROUP : "",
                    COSTGROUPTEXT : "",
                    USEYN : false,

                    /*아래는 UI필드*/
                    editRow : true
                };
                
                oModelDatas.unshift(itemData);
                _oViewTableModel.setProperty("/", oModelDatas);
            },

            /**
             * 테이블 코드 입력값에 대한 검증
             * @param {*} oEvent 
             * @param {*} vField
             * @param {*} vFieldName 
             */
            onCodeListCheck : function(oEvent, vField, vFieldName) {
                var sValue = oEvent.getParameters().value,
                    nRowIndex = oEvent.getSource().getParent().getIndex(),
                    sRowModelPath = _oTable.getContextByIndex(nRowIndex).getPath().replace("/","");
                
                var sKey = "", oDataName = "o"+vField, sKeyNm = "";
                switch (vField) {
                    case "COMPANYCODE" :
                        sKey = "CompanyCode"; 
                        sKeyNm = "CompanyCodeName";
                        break;
                    case "Category" :
                        sKey = "Code";
                        sKeyNm = "Name";
                        break;
                }
                
                if(this[oDataName]) {
                    var aCodeList = this[oDataName] || [],
                        cCodeData;
                    
                    aCodeList.map(function(item, idx){
                        if(item[sKey] === sValue){
                            cCodeData = item;
                        }
                        return item[sKey];
                    });
                    
                    if(cCodeData) {
                        oEvent.getSource().getParent().oParent.mBindingInfos.rows.binding.oList[sRowModelPath][vFieldName] = cCodeData[sKeyNm];
                    }else{
                        MessageToast.show(_i18n.getText("MSG_CHECK_VH"));
                        //oEvent.getSource().getParent().oParent.mBindingInfos.rows.binding.oList[sRowModelPath][vField] = "";
                        oEvent.getSource().setValue("");
                        oEvent.getSource().getParent().oParent.mBindingInfos.rows.binding.oList[sRowModelPath][vFieldName] = "";
                    }
                }
            },

            /**
             * Value Help Call
             * @param {*} oEvent 
             * @param {*} sGubunField 
             */
            onValueHelpDialog : function(oEvent, sGubunField, sName){
                var oInput = oEvent.getSource(),
                    nRowIndex = oEvent.getSource().getParent().getIndex(),
                    sRowModelPath = _oTable.getContextByIndex(nRowIndex).getPath().replace("/",""),
                    oParamer = {},
                    aFilter = [];
                switch(sGubunField){
                    case "COMPANYCODE":
                        oParamer = {
                            title : "{i18n>tblCOMPANYCODE}", 
                            EntitySet : "oCOMPANYCODE>/", 
                            TitleProperty : "{oCOMPANYCODE>CompanyCode}",
                            DescriptionProperty : "{oCOMPANYCODE>CompanyCodeName}",
                            TitleFilterField : "CompanyCode",
                            DescFilterField : "CompanyCodeName"
                        };
                        aFilter.push(new Filter("Language", "EQ", "KO"));
                        break;	

                }
                this._openSearchDialog(oParamer, aFilter, function(e){
                    var oDialog = e.getSource();
                    oInput.setValue(oDialog.getTitle());           
                    if(sName) oEvent.getSource().getParent().oParent.mBindingInfos.rows.binding.oList[sRowModelPath][sName] = oDialog.getDescription();
                });
            },

            onValueHelpRequested: function(oEvent, param) {
                var oMultiInput = this.byId(param);
                this._oMultiInput = oMultiInput;
            
                this._oBasicSearchField = new SearchField();
            
                var sDialogName, sModelName;
                if (param === 'fbCOMPANYCODE') {
                    sDialogName = "CompanyCode";
                    sModelName = "oCOMPANYCODE";
                }
            
                this.loadFragment({
                    name: "zcostgroup/view/fragment/" + sDialogName,
                }).then(function(oDialog) {
                    var oFilterBar = oDialog.getFilterBar();
                    this._oVHD = oDialog;
                    this.getView().addDependent(oDialog);
                    var oVHModel = this.getView().getModel(sModelName);
            
                    oFilterBar.setFilterBarExpanded(false);
                    oFilterBar.setBasicSearch(this._oBasicSearchField);
            
                    // Trigger filter bar search when the basic search is fired
                    this._oBasicSearchField.attachSearch(function() {
                        oFilterBar.search();
                    });
            
                    oDialog.getTableAsync().then(function (oTable) {
                        oTable.setModel(oVHModel);
            
                        // For Desktop and tabled the default table is sap.ui.table.Table
                        if (oTable.bindRows) {
                            // Bind rows to the ODataModel and add columns
                            oTable.bindAggregation("rows", {
                                path: "/",
                                events: {
                                    dataReceived: function() {
                                        oDialog.update();
                                    }
                                }
                            });
            
                            if (param === 'fbCOMPANYCODE') {
                                oTable.addColumn(new sap.ui.table.Column({label: new sap.m.Label({text: "{i18n>COMPANYCODE}"}), template: new sap.m.Text({wrapping: false, text: "{CompanyCode}"})}));
                                oTable.addColumn(new sap.ui.table.Column({label: new sap.m.Label({text: "{i18n>COMPANYNAME}"}), template: new sap.m.Text({wrapping: false, text: "{CompanyCodeName}"})}));
                            }
                        }
                    }.bind(this));                   
                    
                    oDialog.setTokens(this._oMultiInput.getTokens()); 
                    oDialog.open();
                }.bind(this));
            },


            onValueHelpOkPress: function (oEvent) {
                var aTokens = oEvent.getParameter("tokens");
                this._oMultiInput.setTokens(aTokens);
                this._oVHD.close();
            },
    
            onValueHelpCancelPress: function () {
                this._oVHD.close();
            },
    
            onValueHelpAfterClose: function () {
                this._oVHD.destroy();
            },
        
              //다이얼로그 검색 
            onFilterBarSearch: function (oEvent) {
                var sSearchQuery = this._oBasicSearchField.getValue(),
                    aSelectionSet = oEvent.getParameter("selectionSet");
            
                var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
                    if (oControl.getValue()) {
                        aResult.push(new Filter({
                            path: oControl.getName(),
                            operator: FilterOperator.Contains,
                            value1: oControl.getValue()
                        }));
                    }
            
                    return aResult;
                }, []);
            
                var sPath1, sPath2;
               if (this._oVHD.getKey() === "CompanyCode") {
                    sPath1 = "CompanyCode";
                    sPath2 = "CompanyCodeName";
                }
            
                aFilters.push(new Filter({
                    filters: [
                        new Filter({ path: sPath1, operator: FilterOperator.Contains, value1: sSearchQuery }),
                        new Filter({ path: sPath2, operator: FilterOperator.Contains, value1: sSearchQuery })
                    ],
                    and: false
                }));
            
                this._filterTable(new Filter({
                    filters: aFilters,
                    and: true
                }));
            },

            _filterTable: function (oFilter) {
                var oVHD = this._oVHD;
    
                oVHD.getTableAsync().then(function (oTable) {
                    if (oTable.bindRows) {
                        oTable.getBinding("rows").filter(oFilter);
                    }
                    if (oTable.bindItems) {
                        oTable.getBinding("items").filter(oFilter);
                    }
    
                    // This method must be called after binding update of the table.
                    oVHD.update();
                });
            },


            /* 이하 excel controll */
            excelExport:function(){

                var self = this,
                oView = this.getView(),
                aColumns = _oTable.getColumns(), 
                aColumnConfig = [],
                oI18n = oView.getModel("i18n"),
                sTitle = oI18n.bindProperty("title").getValue();
                    
                aColumns.forEach(function(col){
                    
                    var sProperty = col.getTemplate().getBindingPath("text");

                    if(!sProperty) {
                        sProperty = col.getTemplate().getBindingPath("value");
                    }
                    if(sProperty === undefined){
                        sProperty = "USEYN";
                    }
                    
                    var sText = "";
                    if(col.getLabel() === null) {
                        sText = col.getMultiLabels()[0].getText().trim();
                    } else {
                        sText = col.getLabel().getText();
                    }
                    
                    var obj = {
                        label : sText,
                        property : sProperty
                    };
                    
                    var bVisible = col.getVisible();
                    if(bVisible){
                        aColumnConfig.push(obj);
                    }
                });
                
                var oRowBinding, oSettings, oSheet;
                    oRowBinding = _oTable.getBinding();
                var oModel = oRowBinding.getModel(),
                    sPath = oRowBinding.sPath,
                    aModelData = oModel.getProperty(sPath);
                
                if(!aModelData || !aModelData.length){
                    return;
                }else{
                    aModelData.forEach(function(item){
                        if(item.USEYN){
                            item.USEYN = "X";
                        }else{
                            item.USEYN = "";
                        }
                    });
                }
                
                oSettings = {
                    workbook: { columns: aColumnConfig },
                    dataSource: aModelData,
                    fileName : sTitle + ".xlsx"
                };
        
                oSheet = new Spreadsheet(oSettings);
                oSheet.build().finally(function() {
                    oSheet.destroy();
                });
            },
            excelImport: function(){
                var uploaderVisible = _oLayout.getProperty("/uploaderVisible");
                if(!uploaderVisible){
                    _oViewTableModel.setProperty("/",[]);
                    _oLayout.setProperty("/tableCnt", 0);
                }
                _oLayout.setProperty("/uploaderVisible",!uploaderVisible);
                _oLayout.setProperty("/exportVisible",false);
            },
            excelHandleUploadComplete: function(oEvent) {
                var oFileForm = oEvent.getSource().getDomRef();
                var $oFileInput = $(oFileForm).find("input[type='file']");
                this.excelUpload($oFileInput[0]);
            },
            excelHandleUploadPress: function(oEvent) {
                var self = this,
                    oFileUploader = self.byId("iFileUploader");
                    
                if(!oFileUploader.getShortenValue()) {
                    return MessageToast.show(_i18n.getText("MSG_EXCEL_FILE"), { width: "30em", at: "center" });
                }else{
                    _vFlg = true;
                }

                MessageBox.confirm(_i18n.getText("MSG_CHECK_EXCEL"), {
                    actions: ["Confirm", sap.m.MessageBox.Action.CANCEL],
                    styleClass: "sapUiSizeCompact",
                    onClose: function(sAction) {
                        if(sAction === "Confirm"){
                            _oTable.setBusy(true);
                            oFileUploader.upload();
                        }
                    }.bind(this)
                });

            },
            excelUpload : function (fileUpload) {
                var self = this;
                if (typeof (FileReader) !== "undefined") {
                    var reader = new FileReader();
     
                    //For Browsers other than IE.
                    if (reader.readAsBinaryString) {
                        reader.onload = function (e) {
                            self.excelProcess(e.target.result);
                        };
                        reader.readAsBinaryString(fileUpload.files[0]);
                    } else {
                        //For IE Browser.
                        reader.onload = function (e) {
                            var data = "";
                            var bytes = new Uint8Array(e.target.result);
                            for (var i = 0; i < bytes.byteLength; i++) {
                                data += String.fromCharCode(bytes[i]);
                            }
                            self.excelProcess(data);
                        };
                        reader.readAsArrayBuffer(fileUpload.files[0]);
                    }
                } else {
                    MessageToast.show(_i18n.getText("MSG_EXCEL_ERROR"));
                }
            },
            excelProcess : function (data) {
         
                var workbook = XLSX.read(data, {
                    type: 'binary'
                });
                //Fetch the name of First Sheet.
                var firstSheet = workbook.SheetNames[0];
                //Read all rows from First Sheet into an JSON array.
                var excelRows = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[firstSheet]),
                    aCols = this.excelColumnConfig(),
                    aUploadData = [];
                var self = this;
                var errText = "";
                
                excelRows.forEach(function(item,idx){
                    var exData = {};
                    var vUSEYN = false;
                    aCols.forEach(function(col){
                        var label = col.label,
                            tempPath = col.property;
                        exData[tempPath] = item[label];
                    });
                    
                    if(item[_i18n.getText("USEYN")] === "X" || item[_i18n.getText("USEYN")] === "x"){
                        vUSEYN = true;
                    }
                    
                    exData.COMPANYCODE = item[_i18n.getText("COMPANYCODE")];
                    exData.COMPANYNAME = item[_i18n.getText("COMPANYNAME")];
                    exData.COSTGROUP = item[_i18n.getText("COSTGROUP")];
                    exData.COSTGROUPTEXT = item[_i18n.getText("COSTGROUPTEXT")];
                    exData.USEYN = vUSEYN;
                    exData.editRow = true;
                    
                    aUploadData.push(exData);
                });
                
                _oLayout.setProperty("/tableCnt", aUploadData.length);
                _oLayout.setProperty("/excelUploadSave", true);
                _oViewTableModel.setProperty("/",aUploadData);
                
                this.byId("iFileUploader").setValue("");
                _oTable.setBusy(false);
                this.excelImport();
                if(!_vFlg){
                      return MessageToast.show(errText);
                }
            },
            excelColumnConfig: function () {
                var oView, aColumns, aColumnConfig;
          
                oView = this.getView();
                aColumns = _oTable.getColumns();
          
                aColumnConfig = aColumns.map(
                  function (oCol) {
                    var bVisible = oCol.getVisible();
          
                    if (bVisible) {
                      var sLabel = $.trim(oCol.getLabel().getText()),
                        oBindingInfo = this.excelBindingInfo(oCol),
                        sPath;
                        if(oBindingInfo === undefined){
                          sPath = "USEYN";
                        }else{
                          sPath = oBindingInfo.parts[0].path;
                        }
                      return {
                        label: sLabel,
                        property: sPath
                      };
                    }
                  }.bind(this)
                );
                return aColumnConfig;
            },
            excelBindingInfo: function (col) {
                var colTemp = col.getTemplate(),
                sResult = "";
        
                if (colTemp.getText) {
                sResult = colTemp.getBindingInfo("text");
                } else if (colTemp.getValue) {
                sResult = colTemp.getBindingInfo("value");
                } else {
                return sResult;
                }
                return sResult;
            },
            excelTempletDown : function(){
                var aCols, oSettings, oDataSample, oDataTemp;
                oDataTemp = [];
                aCols = this.excelColumnTempConfig();
    
                oDataSample = {};
                oDataSample.COMPANYCODE = "1000";
                oDataSample.COMPANYNAME = "";
                oDataSample.COSTGROUP = "1001";
                oDataSample.COSTGROUPTEXT = "상품1";
                oDataSample.USEYN = "X";
                oDataTemp.push(oDataSample);
                
                oDataSample = {};
                oDataSample.COMPANYCODE = "1000";
                oDataSample.COMPANYNAME = "";
                oDataSample.COSTGROUP = "1002";
                oDataSample.COSTGROUPTEXT = "상품2";
                oDataSample.USEYN = "";
                oDataTemp.push(oDataSample);
    
                oSettings = {
                    workbook: { columns: aCols },
                    dataSource : oDataTemp  	//	dataSource: [oDataSample]
                };
    
                new Spreadsheet(oSettings)
                    .build()
                    .then( function() {
                        MessageToast.show(_i18n.getText("MSG_EXCEL_SAVE"));
                });
            },
            excelColumnTempConfig : function(){
                return [
                    { label : _i18n.getText("COMPANYCODE"), 			property : "COMPANYCODE" },
                    { label : _i18n.getText("COMPANYNAME"), 			property : "COMPANYNAME" },
                    { label : _i18n.getText("COSTGROUP"), 			    property : "COSTGROUP" },
                    { label : _i18n.getText("COSTGROUPTEXT"), 			property : "COSTGROUPTEXT" },
                    { label : _i18n.getText("USEYN"), 			        property : "USEYN" }
                ];
            }
            /* 여기까지 excel controll */
        });
    });
