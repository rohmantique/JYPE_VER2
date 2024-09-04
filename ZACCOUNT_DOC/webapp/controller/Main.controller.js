   sap.ui.define([
        "zaccountdoc/controller/BaseController",
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
        "sap/ui/core/date/UI5Date",
        'sap/ui/table/Column',
        'sap/m/Column',        
    ],
        /**
         * @param {typeof sap.ui.core.mvc.Controller} Controller
         */
        function (Controller, Sorter, Filter, FilterOperator, JSONModel, ODataModel, ResourceModel, Spreadsheet, MessageToast, MessageBox, SearchField, Button, Dialog, UI5Date) {
            "use strict";

            var _vFlg = true;
            var _vCnt;
            var _oModelMain;
            var _oDataList = {};
            var _oLayout;
            var _oTable;
            var _oViewTableModel;
            var _i18n;

            return Controller.extend("zaccountdoc.controller.Main", {

                onInit: function () {

                    var oView = this.getView();
                    this.setInitPage(oView);                    
                },

                onAfterRendering: function() {
                    var sWindowHeight = window.innerHeight;
                    var sRowCount = Math.floor((sWindowHeight-300)/33);
                    _oTable.setVisibleRowCount(sRowCount);
                },

                /**
                 * 화면설정초기화
                 * @param {*} oView
                 */
                setInitPage : function(oView){

                    var self = this;
                    //i18n
                    _i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle();

                    //view.xml table id
                    _oTable = oView.byId("iACCOUNTDOCList");

                    //view.xml table row path model
                    _oViewTableModel = this._createJSONModel(oView,"oZCOSTGROUP");
                    _oViewTableModel.setProperty("/", []);

                    //view.xml Page layout
                    _oLayout = this._createJSONModel(oView,"oLayout");
                    _oLayout.setData({
                        "tableCnt": 0,
                        "exportVisible": false,
                    });

                    //main model
                    _oModelMain = this._setCustomModel(_oDataList, oView, "oMODELMAIN", "/sap/opu/odata/sap/YY1_MONTHLYREPORT001_CDS/", "/YY1_MONTHLYREPORT001", "ODataModel");

                    //value help list
                    var oCOMPANYCODE = this._setCustomModel(_oDataList, oView, "oCOMPANYCODE", "/sap/opu/odata/sap/API_COMPANYCODE_SRV/", "/A_CompanyCode", "JSONModel");
                    var oCUSTOMER = this._setCustomModel(_oDataList, oView, "oCUSTOMER", "/sap/opu/odata/sap/API_BUSINESS_PARTNER/", "/A_Customer", "JSONModel");
                    var oGLACCOUNT = this._setCustomModel(_oDataList, oView, "oGLACCOUNT", "/sap/opu/odata/sap/API_GLACCOUNTINCHARTOFACCOUNTS_SRV/", "/A_GLAccountText", "JSONModel");
                    //var oGLACCOUNTITEM = self._setCustomModel(_oDataList, oView, "oGLACCOUNTITEM", "/sap/opu/odata/sap/API_GLACCOUNTLINEITEM/", "/GLAccountLineItem", "JSONModel");
                    var oGLACCOUNTITEM = self._setCustomModel(_oDataList, oView, "oGLACCOUNTITEM", "/sap/opu/odata/sap/ZSB_ACCOUNTDOC_DEV/", "/Zr_Accountdoc", "JSONModel");


                    //코드성 데이터 Read
                    var sSorter1 = [
                        new Sorter("CompanyCode")
                    ];
                    $.when(
                        this._getODataModelRead(_oDataList["oCOMPANYCODE"],null,null,sSorter1)
                    ).done(function(oResults){
                        oCOMPANYCODE.setProperty("/", oResults);
                        self.setFilterBarSetting(oView);
                    });

                    var sSorter2 = [
                        new Sorter("Customer")
                    ];
                    var sCUSTOMER_P = {
                        $select: "Customer,CustomerName"
                    };
                    $.when(
                        this._getODataModelRead(_oDataList["oCUSTOMER"],null,sCUSTOMER_P,sSorter2)
                    ).done(function(oResults){
                        oCUSTOMER.setSizeLimit(oResults.length); 
                        oCUSTOMER.setProperty("/", oResults);
                    });

                    var sSorter3 = [
                        new Sorter("GLAccount")
                    ];
                    var sGLACCOUNT_P = {
                        $select: "GLAccount,GLAccountName"
                    };
                    var sGLACCOUNT_F = [
                        new Filter("Language", "EQ", "KO")
                    ];
                    $.when(
                        this._getODataModelRead(_oDataList["oGLACCOUNT"],sGLACCOUNT_F,sGLACCOUNT_P,sSorter3)
                    ).done(function(oResults){
                        oGLACCOUNT.setSizeLimit(oResults.length); 
                        oGLACCOUNT.setProperty("/", oResults);            
                    });        

                },
                
                onLiveChange: function(oEvent){
                    var vInputValue = oEvent.getParameter("value");
                    
                    var aItems = vInputValue.split(" "); // 줄바꿈 문자로 텍스트를 분할합니다.
                    var oMultiInput = this.byId("fbCUSTOMER");
                    oMultiInput.setValue(""); // 입력된 텍스트를 지웁니다.

                    for (var i = 0; i < aItems.length; i++) {
                        var vItem = aItems[i].trim();  // 공백 제거
                        if (vItem) {
                            oMultiInput.addToken(new sap.m.Token({ key: vItem, text: vItem }).data("range", {"exclude": false, "operation": sap.ui.comp.valuehelpdialog.ValueHelpRangeOperation.EQ, "keyField": "Customer", "value1": vItem, "value2": "" }));
                        }
                    }

                    //타이머를 줘야 텍스트가 사라짐.
                    setTimeout(function() {
                        oMultiInput.setValue(""); // 입력된 텍스트를 지웁니다.
                    }, 1); 

                },

                setFilterBarSetting : function(oView){

                    var vCompanyCode = this.getView().getModel("oCOMPANYCODE").oData[0].CompanyCode;
                    this.byId("fbCOMPANYCODE").setSelectedKeys(vCompanyCode);
                    
                    var today = new Date();
                    var year = today.getFullYear();
                    var month = today.getMonth();
                    var day = today.getDate();
                    var oModelDate = new JSONModel();
                    oModelDate.setData({
                        StrPeriod_s: UI5Date.getInstance(year, 0, 1),
                        StrPeriod_e: UI5Date.getInstance(year, month, day)
                    });
                    this.getView().setModel(oModelDate);

                },

                getLastDayOfMonth : function(ym){
                    var date = new Date(ym.substr(0,4), parseInt(ym.substr(4,2))-1, 1);
                    date.setMonth(date.getMonth() + 1);
                    date.setDate(date.getDate() - 1);
                    return date.getDate();
                },

                getLastDayOfMonthAPI : function(ym){
                    var date = new Date(ym.substr(0,4), parseInt(ym.substr(4,2))-1, 1);
                    date.setMonth(date.getMonth() + 1);
                    date.setDate(date.getDate() - 1);
                    var vMonth = this._conversionCode(date.getMonth()+1,2);
                    var dateto = date.getFullYear()+"-"+vMonth+"-"+date.getDate()+"T09:00:00";
                    return dateto;
                },

                //value help
                onValueHelpRequested: function() {

                    var oMultiInput = this.byId("fbCUSTOMER");
                    this._oMultiInput = oMultiInput;

                    this._oBasicSearchField = new SearchField();
                    this.loadFragment({
                        name: "zaccountdoc/view/fragment/Customer",
                    }).then(function(oDialog) {
                        
                        var oFilterBar = oDialog.getFilterBar();
                        this._oVHD = oDialog;

                        // Set key fields for filtering in the Define Conditions Tab
                        oDialog.setRangeKeyFields([{
                            label: "Customer",
                            key: "CustomerCode",
                            type: "string"
                        }]);
                        
                        this.getView().addDependent(oDialog);
                        var oVHModel = this.getView().getModel("oCUSTOMER");

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
                      
                                 oTable.addColumn(new sap.ui.table.Column({label: new sap.m.Label({text: "{i18n>CUSTOMER}"}), template: new sap.m.Text({wrapping: false, text: "{Customer}"})}));
                                 oTable.addColumn(new sap.ui.table.Column({label: new sap.m.Label({text: "{i18n>CUSTOMERNAME}"}), template: new sap.m.Text({wrapping: false, text: "{CustomerName}"})}));
                            }
                        }.bind(this));                   
                        
                        oDialog.setTokens(this._oMultiInput.getTokens()); 
                        oDialog.open();
                    }.bind(this));
                },

                //value help
                onValueHelpRequestedGL: function() {
                   
                    var oMultiInput = this.byId("fbGLACCOUNT");
			        this._oMultiInput = oMultiInput;
 
                    this._oBasicSearchField = new SearchField();
                    this.loadFragment({
                        name: "zaccountdoc/view/fragment/GLAccount",
                    }).then(function(oDialog) {
                        var oFilterBar = oDialog.getFilterBar();
                        this._oVHD = oDialog;

                        this.getView().addDependent(oDialog);
                        var oVHModel = this.getView().getModel("oGLACCOUNT");

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
                      
                                 oTable.addColumn(new sap.ui.table.Column({label: new sap.m.Label({text: "{i18n>GLACCOUNT}"}), template: new sap.m.Text({wrapping: false, text: "{GLAccount}"})}));
                                 oTable.addColumn(new sap.ui.table.Column({label: new sap.m.Label({text: "{i18n>GLACCOUNTNAME}"}), template: new sap.m.Text({wrapping: false, text: "{GLAccountName}"})}));
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
        
                    aFilters.push(new Filter({
                        filters: [
                            new Filter({ path: "Customer", operator: FilterOperator.Contains, value1: sSearchQuery }),
                            new Filter({ path: "CustomerName", operator: FilterOperator.Contains, value1: sSearchQuery })
                        ],
                        and: false
                    }));
        
                    this._filterTable(new Filter({
                        filters: aFilters,
                        and: true
                    }));
                },
                
                onFilterBarSearchGL: function (oEvent) {
                    var sSearchQueGLry = this._oBasicSearchField.getValue(),
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

                    aFilters.push(new Filter({
                        filters: [
                            new Filter({ path: "GLAccount", operator: FilterOperator.Contains, value1: sSearchQueGLry }),
                            new Filter({ path: "GLAccountName", operator: FilterOperator.Contains, value1: sSearchQueGLry })
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

                onNavigateToStandard: function(oEvent) {

                    var vColIdx = parseInt(oEvent.getParameter("columnIndex"));
                    var vRowIdx = parseInt(oEvent.getParameter("rowIndex"));

                    // 금액아닌 경우 제외
                    if (vColIdx < 3){
                        return;
                    }

                    var vRows = oEvent.getSource().getRows();
                    var vSelRows = vRows[vRowIdx];

                    var vGLAccount = vSelRows.mAggregations.cells[2].mAggregations.items[0].mProperties.text;
                                            
                    if (vGLAccount == "총계" || vGLAccount == "") return;
                    
                    // 선택한 Row의 값 가져와서 조회조건 셋팅
                    var vCompanyCode = this.byId("fbCOMPANYCODE").getSelectedKeys()[0];
                    var vCustomer = vSelRows.mAggregations.cells[0].mAggregations.items[0].mProperties.text;
                    
                    // 현잔액 = 기간 To의 말일
                    if (vColIdx == 3){
                        var vEnd = this.byId("fbStrPeriod_e").getValue().replace("-", "");
                        var vKeyDate = vEnd+this.getLastDayOfMonth(vEnd);
                    
                    // 월 = 해당 월의 말일
                    }else{
                        var vEnd = vSelRows.mAggregations.cells[vColIdx].mAggregations.items[0].mBindingInfos.text.parts[0].path;
                        
                        // 이전데이터 조회시 전월의 말일로 셋팅 
                        if(vEnd == "ETC"){
                            var vStr = this.byId("fbStrPeriod_s").getValue().replace("-", "");
                            var vStrYear = parseInt(vStr.substring(0,4));
                            var vStrMonth = parseInt(vStr.substring(4,6));
                            
                            if (vStrMonth == "01"){
                                vEnd = vStrYear - 1+"12";
                            }else{
                                var vMonth = (vStrMonth - 1);
                                if (vMonth.toString().length == 1) vMonth = "0" + vMonth;
                                vEnd = vStrYear + "" + vMonth;
                            }
                        }

                        var vKeyDate = vEnd+this.getLastDayOfMonth(vEnd);
                    }
                    
                    
                    if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getService) {
                        var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
                
                        var sHash = oCrossAppNavigator.hrefForExternal({
                            target: {
                                semanticObject: "Customer",
                                action: "manageLineItems" 
                            },
                            params: {
                                "Customer": vCustomer,
                                "CompanyCode": vCompanyCode,
                                "KeyDate" : vKeyDate,
                                "sap-tag": "superiorAction",
                                "sap-keep-alive":"restricted"
                            }
                        }) || "";
                
                        // 내비게이션 실행
                        // oCrossAppNavigator.toExternal({
                        //     target: {
                        //         shellHash: sHash
                        //     }
                        // });

                        sap.m.URLHelper.redirect(window.location.href.split('#')[0] + sHash, true);
                    } else {
                        console.error("Cross-Application Navigation 서비스를 사용할 수 없습니다.");
                    }
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

                    var vStr = this.byId("fbStrPeriod_s").getValue().replace("-", "");
                    var vEbd = this.byId("fbStrPeriod_e").getValue().replace("-", "");
                    var vStrPeriod = vStr+this.getLastDayOfMonth(vStr);
                    var vEndPeriod = vEbd+this.getLastDayOfMonth(vEbd);
                    var vEndPeriodApi = this.getLastDayOfMonthAPI(vEbd);
                    var vZeroExcept = this.byId("fbZeroExcept").getSelected();

                    if(vEbd === ""){
                        vEndPeriod = vEndPeriod;
                    }

                    var oFilter = new Filter({
                        filters : [
                            new Filter({
                                path: 'PostingDate',
                                operator: FilterOperator.LE,
                                value1: vEndPeriodApi

                            }), 
                            new Filter({   
                                filters : [
                                    new Filter({ 
                                        path: 'ClearingDate',
                                        operator: FilterOperator.GT,
                                        value1: vEndPeriodApi
                                    }),

                                    new Filter({
                                        path: 'ClearingDate',
                                        operator: FilterOperator.EQ,
                                        value1: null
                                    })
                                ],
                                and : false
                            })
                        ],
                        and : true
                    });                    

                    aFilter.push(oFilter);

                    //미결여부 추가
                    //aFilter.push(new Filter("IsOpenItemManaged", "EQ", "X"));
                    
                    // var sCUSTOMER_P = {
                    //     $select: "Customer,CustomerName"
                    // };
                    // var sGLACCOUNT_P = {
                    //     $select: "GLAccount,GLAccountName"
                    // };
                    // var aFilterGLA = [
                    //     new Filter("Language", FilterOperator.EQ, "KO"),
                    // ];
                    
                    var sGLACCOUNTITEM_P = {
                        //$select: "CompanyCode,FiscalYear,FiscalPeriod,PostingDate,ClearingDate,DocumentDate,Customer,GLAccount,AmountInCompanyCodeCurrency,CompanyCodeCurrency,IsOpenItemManaged",
                        $top:"100000"
                    };

                    // 조회조건이 없거나, PostingDate 조회조건이 없다면 메시지 발생
                    if (!aFilter.length){
                        MessageToast.show(_i18n.getText("MSG_RESULT_FILTER"));
                        _oTable.setBusy(false);
                        return;
                    }

                    this.deleteColumn();
                    this.createColumn(vStrPeriod, vEndPeriod);
                    // Customer 조건이 비었을 때만 추가
                    var vCustomer = this.byId("fbCUSTOMER");
                    var vValue = vCustomer.getProperty("_semanticFormValue");
                    if(vValue.length == 0)
                        aFilter.push(new Filter("Customer", "NE", ""));   
                    
                    $.when(
                        this._getODataModelRead(_oDataList["oGLACCOUNTITEM"],aFilter,sGLACCOUNTITEM_P)
                    ).done(function(oResults){

                        if(!oResults.length) { // 데이터가 없거나 각 이벤트 로직 탄 후 조회했을 경우
                            _oTable.setSelectedIndex(-1);
                            _oViewTableModel.setProperty("/", oResults);
                            _oLayout.setProperty("/tableCnt", oResults.length);
                            _oTable.setBusy(false);
                            if(!vEvent) MessageToast.show(_i18n.getText("MSG_RESULT_NULL"));
                            return;
                        }

                        _oTable.setSelectedIndex(-1);
                        _oViewTableModel.setProperty("/", oResults);
                        _oLayout.setProperty("/tableCnt", oResults.length);

                        var aRows = _oViewTableModel.getProperty("/");
                        var aGroup = [];

                        // 거래처코드, 계정코드 같은걸로 묶음
                        aRows.forEach(elementRows => {

                            var vYear = elementRows.NetDueDate.getFullYear();
                            var vMonth = self._conversionCode(elementRows.NetDueDate.getMonth()+1,2);
                            var vDate = vYear+vMonth;

                            if(aGroup.length > 0){

                                // 조건에 일치하는 데이터 필터링
                                var vItem = aGroup.filter((item) => {
                                    return item.id == elementRows.Customer+"/"+elementRows.GLAccount;
                                })

                                // 조건에 일치하는 데이터가 있다면
                                if(vItem.length > 0){
                                    var vAmount = parseInt(vItem[0].AmountInCompanyCodeCurrency);
                                    vAmount = parseInt(vAmount);

                                    vAmount = vAmount +  parseInt(elementRows.AmountInCompanyCodeCurrency);
                                    vItem[0].AmountInCompanyCodeCurrency = vAmount;

                                    // 조건이 기간에 속하지 않으면 ETC로 빼기
                                    if(vDate < vStrPeriod.substring(0,6)){
                                        if(!vItem[0]["ETC"]) vItem[0]["ETC"] = 0;
                                        vItem[0]["ETC"] = parseInt(vItem[0]["ETC"]) + parseInt(elementRows.AmountInCompanyCodeCurrency);
                                    }else{
                                        if(!vItem[0][vDate]) vItem[0][vDate] = 0;
                                        vItem[0][vDate] = parseInt(vItem[0][vDate]) + parseInt(elementRows.AmountInCompanyCodeCurrency);
                                    }

                                // 조건에 일치하는 데이터가 없다면
                                }else{

                                    // var filteredDataCUS = oResultsCUS.filter(row => row["Customer"] === elementRows.Customer);
                                    // if(filteredDataCUS.length === 0){
                                    //     var filteredData = {};
                                    //     filteredData.CustomerName = "";
                                    //     filteredDataCUS.push(filteredData);
                                    // }
                                    // var filteredDataGLA = oResultsGLA.filter(row => row["GLAccount"] === elementRows.GLAccount);
                                    // if(filteredDataGLA.length === 0){
                                    //     var filteredData = {};
                                    //     filteredData.GLAccountName = "";
                                    //     filteredDataGLA.push(filteredData);
                                    // }

                                    var newItem = {
                                        id : elementRows.Customer+"/"+elementRows.GLAccount,
                                        Customer : elementRows.Customer,
                                        BusinessPartnerName1 : elementRows.CustomerName,
                                        GLAccount : elementRows.GLAccount,
                                        GLAccountName : elementRows.GLAccountName,
                                        CompanyCodeCurrency : elementRows.CompanyCodeCurrency,
                                        AmountInCompanyCodeCurrency : elementRows.AmountInCompanyCodeCurrency
                                    }

                                    // 조건이 기간에 속하지 않으면 ETC로 빼기
                                    if(vDate < vStrPeriod.substring(0,6)){
                                        newItem["ETC"] = elementRows.AmountInCompanyCodeCurrency;
                                    }else{
                                        newItem[vDate] = elementRows.AmountInCompanyCodeCurrency;
                                    }

                                    aGroup.push( newItem );
                                }
                            // 그룹이 없으면 새로 생성
                            }else{

                                // var filteredDataCUS = oResultsCUS.filter(row => row["Customer"] === elementRows.Customer);
                                // if(filteredDataCUS.length === 0){
                                //     var filteredData = {};
                                //     filteredData.CustomerName = "";
                                //     filteredDataCUS.push(filteredData);
                                // }
                                // var filteredDataGLA = oResultsGLA.filter(row => row["GLAccount"] === elementRows.GLAccount);
                                // if(filteredDataGLA.length === 0){
                                //     var filteredData = {};
                                //     filteredData.GLAccountName = "";
                                //     filteredDataGLA.push(filteredData);
                                // }

                                var newItem = {
                                    id : elementRows.Customer+"/"+elementRows.GLAccount,
                                    Customer : elementRows.Customer,
                                    BusinessPartnerName1 : elementRows.CustomerName,
                                    GLAccount : elementRows.GLAccount,
                                    GLAccountName : elementRows.GLAccountName,
                                    CompanyCodeCurrency : elementRows.CompanyCodeCurrency,
                                    AmountInCompanyCodeCurrency : elementRows.AmountInCompanyCodeCurrency
                                }

                                // 조건이 기간에 속하지 않으면 ETC로 빼기
                                if(vDate < vStrPeriod.substring(0,6)){
                                    newItem["ETC"] = elementRows.AmountInCompanyCodeCurrency;
                                }else{
                                    newItem[vDate] = elementRows.AmountInCompanyCodeCurrency;
                                }

                                aGroup.push(newItem);
                            }

                        })

                        if(vZeroExcept){
                            aGroup = aGroup.filter(function(oItem) {
                                return oItem.AmountInCompanyCodeCurrency != 0;
                            });

                        }

                        _oViewTableModel.setProperty("/", aGroup);
                        _oLayout.setProperty("/tableCnt", aGroup.length);

                        aRows = _oViewTableModel.getProperty("/");

                        var newRowData = {
                            GLAccountName : "총계",
                            AmountInCompanyCodeCurrency : 0,
                            CompanyCodeCurrency : aRows[0].CompanyCodeCurrency,
                        };

                        var vStrYear = parseInt(vStrPeriod.substring(0,4));
                        var vStrMonth = parseInt(vStrPeriod.substring(4,6));
                        var vCalYear = vStrYear.toString();
                        var vCalMonth = vStrMonth.toString();
                        if (vCalMonth.length == 1) vCalMonth = "0" + vCalMonth;

                        //조회기간 설정
                        //종료기간과 같아질 때 까지 더하기
                        if(vEndPeriod.length < 1){
                            if (vStrMonth.toString().length < 2) vStrMonth = "0" + vStrMonth;
                            vEndPeriod = vStrYear + "" + vStrMonth ;
                        }

                        aRows.forEach(element => {
                            
                            if(element.ETC){
                                if (!newRowData["ETC"]) newRowData["ETC"] = 0;
                                newRowData["ETC"] = newRowData["ETC"] + parseInt(element.ETC);
                            }

                            while(vEndPeriod >= vCalYear.toString() + vCalMonth){
                                var aCal = vCalYear.toString() + vCalMonth;
                                if(element[aCal]){
                                    if (!newRowData[aCal]) newRowData[aCal] = 0;
                                    newRowData[aCal] = newRowData[aCal] + parseInt(element[aCal]);
                                }

                                // 12월까지만 월 더하고 연도 변경
                                if(vCalMonth < 12) vCalMonth++;
                                else vCalMonth = "01";

                                if(vCalMonth.toString().length == 1) vCalMonth = "0" + vCalMonth;
                                if(vCalMonth == "01") vCalYear++;
                            }

                            if(element.AmountInCompanyCodeCurrency){
                                if (!newRowData["AmountInCompanyCodeCurrency"]) newRowData["AmountInCompanyCodeCurrency"] = 0;
                                newRowData["AmountInCompanyCodeCurrency"] = newRowData["AmountInCompanyCodeCurrency"] + parseInt(element.AmountInCompanyCodeCurrency); 
                            }
   
                            // 계산 값 초기화
                            vCalYear = vStrYear.toString();
                            vCalMonth = vStrMonth.toString();                    
                                
                            if (vCalMonth.length == 1) vCalMonth = "0" + vCalMonth;

                        })

                        aRows.push(newRowData);

                        _oViewTableModel.setProperty("/", aRows);
                        _oLayout.setProperty("/exportVisible", true);

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

                deleteColumn : function(){
                    var oColumns = _oTable.getColumns();
                    var vColumnCnt = _oTable.getColumns().length;
                    for(var i = 4; i < vColumnCnt; i++){
                        _oTable.removeColumn(oColumns[i]);
                    }
                },

                //열 동적으로 생성
                createColumn : function(vStrPeriod,vEndPeriod){
                    var vStrYear = parseInt(vStrPeriod.substring(0,4));
                    var vStrMonth = parseInt(vStrPeriod.substring(4,6));
                    var vEndYear = parseInt(vEndPeriod.substring(0,4));
                    var vEndMonth = parseInt(vEndPeriod.substring(4,6));

                    var vEndPeriod = vEndPeriod;
                    var vStrPeriod = vStrPeriod;

                    // 기간역순조회 체크 : 최근연도~이전까지
                    var vReverse = this.byId("fbPeriodReverse").getSelected();
                    if(!vReverse){

                        // 계산을 위한 변수
                        var vCalYear = vStrYear.toString();
                        var vCalMonth = vStrMonth.toString();
                        if (vCalMonth.length == 1) vCalMonth = "0" + vCalMonth;
                        
                        //조회조건 이전 열
                        // HBox 생성
                        var vHBox = new sap.m.HBox({
                            justifyContent: sap.m.FlexJustifyContent.End
                        });

                        // Text 생성 
                        var oText = new sap.m.Text({
                            text: {
                                parts: [ 
                                    {path: 'oZCOSTGROUP>ETC'},
                                    {path: 'oZCOSTGROUP>CompanyCodeCurrency'}
                                ],
                                type: new sap.ui.model.type.Currency({
                                    currencyCode: true,
                                    showMeasure: false
                                }),
                            }
                        });

                        // HBox 안에 Text를 추가합니다.
                        vHBox.addItem(oText);

                        var vLabel = "";
                        if (vStrMonth == "01"){
                            vLabel = vStrYear - 1 + "/" + "12 이전"
                        }else{
                            var vMonth = (vStrMonth - 1);
                            if (vMonth.toString().length == 1) vMonth = "0" + vMonth;
                            vLabel = vStrYear + "/" + vMonth + " 이전";
                        }

                        _oTable.addColumn(new sap.ui.table.Column({
                            label: new sap.m.Label({text: vLabel}),
                            template: vHBox,
                            width: "150px",
                            hAlign: sap.ui.core.HorizontalAlign.Center,
                        }));

                        //조회기간 설정
                        //종료기간과 같아질 때 까지 더하기
                        if(vEndPeriod.length < 1){
                            if (vStrMonth.toString().length < 2) vStrMonth = "0" + vStrMonth;
                            vEndPeriod = vStrYear + "" + vStrMonth ;
                        }
                        
                        while(vEndPeriod >= vCalYear.toString() + vCalMonth){
                            var vMonth = vCalMonth;

                            // HBox 생성
                            var vHBox = new sap.m.HBox({
                                justifyContent: sap.m.FlexJustifyContent.End
                            });

                            // Text 생성
                            var oText = new sap.m.Text({
                                text: {
                                    parts: [ 
                                        {path: 'oZCOSTGROUP>'+vCalYear.toString() + vCalMonth},
                                        {path: 'oZCOSTGROUP>CompanyCodeCurrency'}
                                    ],
                                    type: new sap.ui.model.type.Currency({
                                        currencyCode: true,
                                        showMeasure: false
                                    }),
                                }, 
                            });

                            // HBox 안에 Text를 추가합니다.
                            vHBox.addItem(oText);

                            _oTable.addColumn(new sap.ui.table.Column({
                                label: new sap.m.Label({text: vCalYear + "/" + vMonth}),
                                template: vHBox,
                                width: "150px",
                                hAlign: sap.ui.core.HorizontalAlign.Center
                            }));

                            // 12월까지만 월 더하고 연도 변경
                            if(vCalMonth < 12) vCalMonth++;
                            else vCalMonth = "01";

                            if(vCalMonth.toString().length == 1) vCalMonth = "0" + vCalMonth;
                            if(vCalMonth == "01") vCalYear++;
                        }
                    }else{
                        
                        // 계산을 위한 변수
                        var vCalYear = vEndYear.toString();
                        var vCalMonth = vEndMonth.toString();
                        if (vCalMonth.length == 1) vCalMonth = "0" + vCalMonth;
                        
                        //조회기간 설정
                        //시작기간과 같아질 때 까지 빼기
                        // if(vStrPeriod.length < 1){
                        //     if (vStrMonth.toString().length < 2) {
                        //         vStrMonth = "0" + vStrMonth;
                        //     }
                        //     vStrPeriod = vStrYear + "" + vStrMonth;
                        // }
                        
                        while(vStrPeriod.substring(0,6) <= vCalYear.toString() + vCalMonth){
                            var vMonth = vCalMonth;

                            // HBox 생성
                            var vHBox = new sap.m.HBox({
                                justifyContent: sap.m.FlexJustifyContent.End
                            });

                            // Text 생성
                            var oText = new sap.m.Text({
                                text: {
                                    parts: [ 
                                        {path: 'oZCOSTGROUP>'+vCalYear.toString() + vCalMonth},
                                        {path: 'oZCOSTGROUP>CompanyCodeCurrency'}
                                    ],
                                    type: new sap.ui.model.type.Currency({
                                        currencyCode: true,
                                        showMeasure: false
                                    }),
                                }, 
                            });

                            // HBox 안에 Text를 추가합니다.
                            vHBox.addItem(oText);

                            _oTable.addColumn(new sap.ui.table.Column({
                                label: new sap.m.Label({text: vCalYear + "/" + vMonth}),
                                template: vHBox,
                                width: "150px",
                                hAlign: sap.ui.core.HorizontalAlign.Center
                            }));

                            // 1월 이면 빼기
                            if(vCalMonth > 1) vCalMonth--;
                            else vCalMonth = "12";

                            if(vCalMonth.toString().length == 1) vCalMonth = "0" + vCalMonth;
                            if(vCalMonth == "12") vCalYear--;
                        }

                        //조회조건 이전 열
                        // HBox 생성
                        var vHBox = new sap.m.HBox({
                            justifyContent: sap.m.FlexJustifyContent.End
                        });

                        // Text 생성 
                        var oText = new sap.m.Text({
                            text: {
                                parts: [ 
                                    {path: 'oZCOSTGROUP>ETC'},
                                    {path: 'oZCOSTGROUP>CompanyCodeCurrency'}
                                ],
                                type: new sap.ui.model.type.Currency({
                                    currencyCode: true,
                                    showMeasure: false
                                }),
                            }
                        });

                        // HBox 안에 Text를 추가합니다.
                        vHBox.addItem(oText);

                        var vLabel = "";
                        if (vStrMonth == "01"){
                            vLabel = vStrYear - 1 + "/" + "12 이전"
                        }else{
                            var vMonth = (vStrMonth - 1);
                            if (vMonth.toString().length == 1) vMonth = "0" + vMonth;
                            vLabel = vStrYear + "/" + vMonth + " 이전";
                        }

                        _oTable.addColumn(new sap.ui.table.Column({
                            label: new sap.m.Label({text: vLabel}),
                            template: vHBox,
                            width: "150px",
                            hAlign: sap.ui.core.HorizontalAlign.Center,
                        }));
                    }                    
                },

                /**
                 * Value Help Call
                 * @param {*} oEvent
                 * @param {*} sGubunField
                 */
                onValueHelpDialog : function(oEvent, sGubunField){
                    var oInput = oEvent.getSource(),
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
                        case "CUSTOMER":
                            oParamer = {
                                title : "{i18n>tblCUSTOMER}",
                                EntitySet : "oCUSTOMER>/",
                                TitleProperty : "{oCUSTOMER>Customer}",
                                DescriptionProperty : "{oCUSTOMER>CustomerName}",
                                TitleFilterField : "Customer",
                                DescFilterField : "CustomerName",
                                Sorter : "Customer"
                            };
                            aFilter.push(new Filter("Language", "EQ", "KO"));
                            break;
                        case "GLACCOUNT":
                            oParamer = {
                                title : "{i18n>tblGLACCOUNT}",
                                EntitySet : "oGLACCOUNT>/",
                                TitleProperty : "{oGLACCOUNT>GLAccount}",
                                DescriptionProperty : "{oGLACCOUNT>GLAccountName}",
                                TitleFilterField : "GLAccount",
                                DescFilterField : "GLAccountName",
                                Sorter : "GLAccount"
                            };
                            aFilter.push(new Filter("Language", "EQ", "KO"));
                            break;                            

                    }
                    this._openSearchDialog(oParamer, aFilter, function(e){
                        var oDialog = e.getSource();
                        oInput.setValue(oDialog.getTitle());
                    });
                },

                formatterCurrency : function(amount, currency){

                    if(amount != null && currency != null){

                        var vCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
                            currencyCode: true,
                            showMeasure : false
                        });

                        return vCurrencyFormat.format(amount, currency);
                    }
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
                        
                        var sItems = col.getTemplate().mAggregations.items[0];
                        
                        var sProperty = sItems.getBindingPath("text");

                        if(!sProperty) {
                            sProperty = sItems.getBindingPath("value");
                        }
                        
                        var sText = "";
                        if(col.getLabel() === null) {
                            sText = col.getMultiLabels()[0].getText().trim();
                        } else {
                            sText = col.getLabel().getText();
                        }
                        
                        // 숫자 필드에 대한 쉼표 처리
                        if(col.getLabel().getText() === "현잔액" || col.getLabel().getText().indexOf("/") > 0 ){
                            var obj = {
                                label : sText,
                                property : sProperty,
                                type: sap.ui.export.EdmType.Number,
                                delimiter : true,
                                scales : 0,
                                width: 20,
                            };
                        }else{
                            var obj = {
                                label : sText,
                                property : sProperty,
                                width: 20,
                            };
                        }
                        
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

                excelColumnTempConfig : function(){
                    return [
                        { label : _i18n.getText("CUSTOMER"), 		  property : "CUSTOMER" },
                        { label : _i18n.getText("CUSTOMERNAME"), 	  property : "CUSTOMERNAME" },
                        { label : _i18n.getText("GLACCOUNTNAME"), 	  property : "GLACCOUNTNAME" },
                        { label : _i18n.getText("BALANCE"),           property : "BALANCE" }
                    ];
                }
                /* 여기까지 excel controll */
                
            });
        });