sap.ui.define([
    "wbsglaccount/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v2/ODataModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
    "sap/ui/model/type/Currency",
    'sap/m/p13n/MetadataHelper',
    '../control/P13nHandler',
    'sap/m/p13n/Engine',
	'sap/ui/core/library',
    "sap/ui/export/Spreadsheet",
    "wbsglaccount/sheetjs/jszip",
    "wbsglaccount/sheetjs/xlsx.full.min"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Filter, FilterOperator, JSONModel, ODataModel, MessageToast, MessageBox, Currency, MetadataHelper, P13nHandler, Engine, CoreLibrary, Spreadsheet ) {
        "use strict";

        var _vCnt;
        var _oModelMain;
        var _oDataList = {};
        var _oLayout;
        var _oTable, _oItemTable;
        var _oViewTableModel;
        var _i18n;

        return Controller.extend("wbsglaccount.controller.Main", {

            onInit: function () {
                var oView = this.getView();
                this.setInitPage(oView);
            },

            onAfterRendering: function() {
                var sWindowHeight = window.innerHeight;
                var sRowCount = Math.ceil((sWindowHeight-430)/33/2);
                _oTable.setVisibleRowCount(sRowCount);
                _oItemTable.setVisibleRowCount(sRowCount);
            },

            
            /**
             * 포맷터
             * @param {*} oView 
             */

            formatCurrency: function(sValue, sCurrency) {
                var oCurrencyType = new Currency({showMeasure: true});
                return oCurrencyType.formatValue([sValue, sCurrency], "string");
            },

            getFormattedDate: function() {
                var now = new Date();
                var formattedDate = now.toISOString();
                formattedDate = formattedDate.substring(0, 19) + 'Z';                
                return formattedDate;
            },

            getLastDayOfMonth : function(fiscalPeriod) {
                var month = parseInt(fiscalPeriod, 10);
                var currentYear = new Date().getFullYear();
                var lastDay = new Date(currentYear, month, 1);
                var formattedDate = lastDay.toISOString();
                formattedDate = formattedDate.substring(0, 10);
            
                return formattedDate;
            },


            /**
             * 화면설정초기화
             * @param {*} oView 
             */
            setInitPage : function(oView){
                var self = this;
                //i18n
                _i18n = self.getOwnerComponent().getModel('i18n').getResourceBundle();               
                
                //view.xml table id
                _oTable = oView.byId("iWBSGLACCOUNTList");
                _oItemTable = oView.byId("iCreateGLTable");
                
                //view.xml table row path model
                _oViewTableModel = self._createJSONModel(oView,"oWBSGLACCOUNT");
                _oViewTableModel.setProperty("/", []);
                
                //view.xml Page layout
                _oLayout = self._createJSONModel(oView,"oLayout");
                _oLayout.setData({
                    "tableCnt": 0,
                    "createTableCnt" : 0,
                    "uploaderVisible": false,
                    "exportVisible": false,
                    "excelUploadSave": false
                });

                //personalize
                this.oComponent = self.getOwnerComponent();
                this.oMetadataHelper = new MetadataHelper([
                    {
                        key: "CostGroup",
                        label: _i18n.getText("CostGroup"),
                        path: "CostGroup"
                    },
                    {
                        key: "CostGroupText",
                        label: _i18n.getText("CostGroupText"),
                        path: "CostGroupText"
                    },
                    {
                        key: "WBSElement",
                        label: _i18n.getText("WBSElement"),
                        path: "WBSElement"
                    },
                    {
                        key: "WBSDescription",
                        label: _i18n.getText("WBSDescription"),
                        path: "WBSDescription"
                    },
                    {
                        key: "AmountInCompanyCodeCurrency",
                        label: _i18n.getText("AmountInCompanyCodeCurrency"),
                        path: "AmountInCompanyCodeCurrency"
                    },
                    {
                        key: "AccountingDocument",
                        label: _i18n.getText("AccountingDocument"),
                        path: "NewAccountDocument"
                    },
                    {
                        key: "FiscalYearPeriod",
                        label: _i18n.getText("FiscalYearPeriod"),
                        path: "FiscalYearPeriod"
                    },
                    {
                        key: "PostingMessage",
                        label: _i18n.getText("ErrorMessage"),
                        path: "PostingMessage"
                    }
                ]);
    
                P13nHandler.registerForP13n(_oTable, this.oMetadataHelper, this.oComponent);

                //필터 초기값 설정
                var oDate = new Date(),
                sYear = oDate.getFullYear().toString(),
                sMonth = (oDate.getMonth() + 1).toString().padStart(2, '0');

                var oFiscalYearDatePicker = self.byId("fbFiscalYear"), // 회계연도
                oFiscalPeriodSelect = self.byId("fbFiscalPeriod"); // 기간

                oFiscalYearDatePicker.setValue(sYear);
                oFiscalPeriodSelect.setSelectedKey(sMonth);

                self.getView().setModel(new JSONModel(),"oCreateGL");

                //main model
                var oGLACCOUNTSTEP = self._setCustomModel(_oDataList, oView, "oGLACCOUNTSTEP", "/sap/opu/odata/sap/YY1_ZCOSTGROUP_STEP_CDS/", "/YY1_ZCOSTGROUP_STEP", "JSONModel");
                var oGLACCOUNTITEM = self._setCustomModel(_oDataList, oView, "oGLACCOUNTITEM", "/sap/opu/odata/sap/API_GLACCOUNTLINEITEM/", "/GLAccountLineItem", "JSONModel");
                var oCOSTGROUPWBS = self._setCustomModel(_oDataList, oView, "oCOSTGROUPWBS", "/sap/opu/odata/sap/YY1_ZCOSTGROUP_WBS_CDS/", '/YY1_ZCOSTGROUP_WBS', "JSONModel");
                var oCOSTGROUPGL = self._setCustomModel(_oDataList, oView, "oCOSTGROUPGL", "/sap/opu/odata/sap/YY1_ZCOSTGROUP_GL_CDS/", '/YY1_ZCOSTGROUP_GL', "JSONModel");
                var oCOSTGROUP = self._setCustomModel(_oDataList, oView, "oCOSTGROUP", "/sap/opu/odata/sap/YY1_ZCOSTGROUP_CDS/", '/YY1_ZCOSTGROUP', "JSONModel");
                var oPOSTING = self._setCustomModel(_oDataList, oView, "oPOSTING", "/sap/opu/odata/sap/YY1_ZCOSTPOSTING_CDS/", "/YY1_ZCOSTPOSTING", "ODataModel");
             
                //value help list
                var oCOMPANYCODE = self._setCustomModel(_oDataList, oView, "oCOMPANYCODE", "/sap/opu/odata/sap/API_COMPANYCODE_SRV/", "/A_CompanyCode", "JSONModel");
                var oGLACCOUNT = self._setCustomModel(_oDataList, oView, "oGLACCOUNT", "/sap/opu/odata/sap/API_GLACCOUNTINCHARTOFACCOUNTS_SRV/", "/A_GLAccountText", "JSONModel");
                var oWBSELEMENT = self._setCustomModel(_oDataList, oView, "oWBSELEMENT", "/sap/opu/odata/sap/API_ENTERPRISE_PROJECT_SRV;v=0002/", "/A_EnterpriseProjectElement", "JSONModel");
                oWBSELEMENT.setSizeLimit(1000); //리스트 데이터 length 조정

                //Communication Model
                var oCOMMUNICATION = self._setCustomModel(_oDataList, oView, "oCOMMUNICATION", "/sap/opu/odata/sap/yy1_zcostgroup_user_cds/", "/YY1_ZCOSTGROUP_USER", "JSONModel");

                //코드성 데이터 Read 
                var urlParameters = {};
                urlParameters = {
                    "$select": "CompanyCode,CompanyCodeName"
                };
                setTimeout(function() {
                $.when(     
                    self._getODataModelRead(_oDataList["oCOMPANYCODE"])
                ).done(function(oResults){
                    oCOMPANYCODE.setProperty("/", oResults);
                    self.getView().byId("fbCompanyCode").setSelectedKey(oResults[0].CompanyCode)
                        });
                }, 0);
                
                $.when(     
                    self._getODataModelRead(_oDataList["oWBSELEMENT"])
                ).done(function(oResults){
                    oWBSELEMENT.setProperty("/", oResults);
                });

                $.when(     
                    self._getODataModelRead(_oDataList["oGLACCOUNTSTEP"])
                ).done(function(oResults){
                    oGLACCOUNTSTEP.setProperty("/", oResults);
                });

                $.when(     
                    self._getODataModelRead(_oDataList["oGLACCOUNTITEM"])
                ).done(function(oResults){
                    oGLACCOUNTITEM.setProperty("/", oResults);
                });

                $.when(     
                    self._getODataModelRead(_oDataList["oCOSTGROUPGL"])
                ).done(function(oResults){
                    oCOSTGROUPGL.setProperty("/", oResults);
                });

                $.when(     
                    self._getODataModelRead(_oDataList["oCOMMUNICATION"])
                ).done(function(oResults){
                    oCOMMUNICATION.setProperty("/", oResults);
                });

                var aFilter = [];
                aFilter.push(new Filter("Language", "EQ", "KO"));

                $.when(     
                    self._getODataModelRead(_oDataList["oGLACCOUNT"],aFilter)
                ).done(function(oResults){
                    oGLACCOUNT.setProperty("/", oResults);
                });

            },

            // 그리드 & 버튼 초기화 
            resetToInitialState: function() {
                var oView = this.getView(),
                oPostButton = oView.byId("iPOSTButton"),
                oSaveButton = oView.byId("iSaveButton"),
                oCancelButton = oView.byId("iCancelButton");
                
                oView.byId('page').setShowFooter(!oView.byId('page').getShowFooter());
                this.byId("iCreateGLTable").setVisible(false);

                oPostButton.setVisible(true);
                oSaveButton.setVisible(false);
                oCancelButton.setVisible(false);
            
                var oTable = oView.byId("iWBSGLACCOUNTList");
                oTable.setBusy(false);
            },

             /**
             * 개인화 설정
             * @param {*} oView 
             */

            openPersoDialog: function(oEvent) {
                Engine.getInstance().show(_oTable, ["Columns", "Sorter"], {
                    contentHeight: "35rem",
                    contentWidth: "32rem",
                    source: oEvent.getSource()
                });
            },

            onColumnHeaderItemPress: function(oEvent) {
                const sPanel = oEvent.getSource().getIcon().indexOf("sort") >= 0 ? "Sorter" : "Columns";

                Engine.getInstance().show(_oTable, [sPanel], {
                    contentHeight: "35rem",
                    contentWidth: "32rem",
                    source: _oTable
                });
            },

            onSort: function(oEvent) {
                const oColumn = oEvent.getParameter("column");
                const sSortOrder = oEvent.getParameter("sortOrder");

                Engine.getInstance().retrieveState(_oTable).then(function(oState) {
                    oState.Sorter.forEach(function(oSorter) {
                        oSorter.sorted = false;
                    });
                    oState.Sorter.push({
                        key: this._getKey(oColumn),
                        descending: sSortOrder === CoreLibrary.SortOrder.Descending
                    });

                    Engine.getInstance().applyState(_oTable, oState);
                }.bind(this));
            },

            onColumnResize: function(oEvent) {
                const oColumn = oEvent.getParameter("column");
                const sWidth = oEvent.getParameter("width");
                const oColumnState = {};
                oColumnState[this._getKey(oColumn)] = sWidth;

                Engine.getInstance().applyState(_oTable, {
                    ColumnWidth: oColumnState
                });
            },

            onColumnMove: function(oEvent) {
                const oColumn = oEvent.getParameter("column");
                const iNewIndex = oEvent.getParameter("newPos");

                Engine.getInstance().retrieveState(_oTable).then(function(oState) {
                    const oColumnState = oState.Columns.find(function(oCol) {
                        return oCol.key === this._getKey(oColumn);
                    }.bind(this));

                    if (oColumnState) {
                        oColumnState.position = iNewIndex;
                        Engine.getInstance().applyState(_oTable, {
                            Columns: [oColumnState]
                        });
                    }
                }.bind(this));
            },

            _getKey: function(oColumn) {
                return this.getView().getLocalId(oColumn.getId());
            },

            /**
             * 조회
             * @param {*} vEvent 
             */

            onSearch: function (vEvent) {
                var self = this;
                
                var oFilterBar = self.byId("iFilterBar"),
                aFilterGroupItems = oFilterBar.getFilterGroupItems();
            
                // mandatory 필드 체크
                var vValid = true;
                aFilterGroupItems.forEach(function (oFilterGroupItem) {
                  if (oFilterGroupItem.getMandatory()) {
                    var oControl = oFilterGroupItem.getControl();
                    
                    if (oControl instanceof sap.m.Select) {
                      // 리스트 드롭박스 유형인 경우
                      if (!oControl.getSelectedKey()) {
                        var vLabel = oControl.getLabels()[0].getProperty('text');
                        oControl.setValueState("Error");
                        oControl.setValueStateText(_i18n.getText("MANDATORY_SELECT_FIELD", [vLabel]));
                        vValid = false;
                      } else {
                        oControl.setValueState("None");
                      }
                    } else {
                      // 그 외의 유형인 경우
                      if (!oControl.getValue()) {
                        var vLabel = oControl.getLabels()[0].getProperty('text');
                        oControl.setValueState("Error");
                        oControl.setValueStateText(_i18n.getText("MANDATORY_INPUT_FIELD", [vLabel]));
                        vValid = false;
                      } else {
                        oControl.setValueState("None");
                      }
                    }
                  }
                });
            
                if (!vValid) {
                    return;
                }
            
                // 전표 생성 중인 상태 판단
                if (!self.getView().byId("iPOSTButton").getVisible()) {
                    MessageBox.confirm(_i18n.getText("CONFIRM_POST_CREATION"), {
                        onClose: function (oAction) {
                            if (oAction === MessageBox.Action.OK) {
                                // 전표 생성 취소 로직 수행
                                self.resetToInitialState()
                                // onSearch 로직 수행
                                self.performSearch(vEvent);
                            }
                        }
                    });
                } else {
                    // onSearch 로직 수행
                    self.performSearch(vEvent);
                }
            },
            
            
            performSearch: function (vEvent) {
                var self = this;

                if(!_oTable.isBusy()){
                    _oTable.setBusy(true);
                }
                var aFilter = [];
        
                // 기간 및 회계연도 필터 조건 추가
                var sCompanyCode = self.byId("fbCompanyCode").getSelectedKey(),
                sFiscalYear = self.byId("fbFiscalYear").getValue().trimLeft(),
                sFiscalPeriod = self.byId("fbFiscalPeriod").getSelectedKey(),
                sNewAccountDocument = self.byId("fbNewAccountDocument").getSelectedKey(),
                sWBSElement = self.byId("fbWBSElement").getValue().trimLeft(),
                vZeroExcept = self.byId("fbZeroExcept").getSelected();
                
                if (sFiscalPeriod) {
                    if(sFiscalPeriod.length === 1){
                        sFiscalPeriod = '00' + sFiscalPeriod;
                    } else if(sFiscalPeriod.length === 2){
                        sFiscalPeriod = '0' + sFiscalPeriod;
                    }
                }

                var oView = self.getView();

                var oGLACCOUNTITEM = oView.getModel("oGLACCOUNTITEM");
               
                var sWBSELEMENT_P = {
                    $select: "WBSElementInternalID,ProjectElement,ProjectElementDescription"
                };
                var aFilterSTEP = [
                    new Filter("STEP", FilterOperator.EQ, "1")
                ];

                var sPOSTING_P = {
                    $select: "FISCALPERIOD,WBSELEMENT,ACCOUNTINGDOCUMENT,POSTINGDATE,POSTINGMSG,FISCALYEAR,GROUPKEY,COMPANYCODE"
                };
                var aFilterPROGRAMID = [
                    new Filter("PROGRAMID", FilterOperator.EQ, "1"),
                    new Filter("COMPANYCODE", FilterOperator.EQ, sCompanyCode),
                    new Filter("FISCALYEAR", FilterOperator.EQ , sFiscalYear),
                    new Filter("FISCALPERIOD", FilterOperator.EQ ,sFiscalPeriod)
                ];
                var sGLACCOUNTITEM_P = {
                    $select: "WBSElementInternalID,AccountingDocument,CompanyCode,FiscalYear,FiscalPeriod,AmountInCompanyCodeCurrency,CompanyCodeCurrency,IsReversed,ReversalReferenceDocument,GLAccount",
                    $top:'500000',
                    $inlinecount: 'allpages'

                };

                $.when(     
                    self._getODataModelRead(_oDataList["oWBSELEMENT"],null,sWBSELEMENT_P,null),
                    self._getODataModelRead(_oDataList["oPOSTING"],aFilterPROGRAMID,sPOSTING_P,null),
                    self._getODataModelRead(_oDataList["oGLACCOUNTSTEP"],aFilterSTEP,null,null),
                    self._getODataModelRead(_oDataList["oCOSTGROUP"])
                ).done(function(oResultsWbs,oResultsPost,oResultsStep,oResultsCost){

                    var filteredDataWBS = oResultsWbs.filter(row => row["ProjectElement"] === sWBSElement);
                    
                    oResultsStep = self._setValueHelpName(oResultsStep,oResultsCost,"COSTGROUP","COSTGROUP","COSTGROUPTEXT","COSTGROUPTEXT");

                    var oCOSTGROUPGLData = self.getView().getModel('oCOSTGROUPGL').getData();

                    oResultsStep.forEach(function(result) {
                        var matchingCostGroup = oCOSTGROUPGLData.find(function(costGroup) {
                        return costGroup.COSTGROUP === result.COSTGROUP;
                        });
                        if (matchingCostGroup) {
                            result.WORKINPROCESSGL = matchingCostGroup.WIP_GL;
                            result.COSTELEMENTGL = matchingCostGroup.COST_GL;
                        }
                    })

                    var aFilterGLI1 = [
                        new Filter("SourceLedger", FilterOperator.EQ, "0L"),
                        new Filter("CompanyCode", FilterOperator.EQ, sCompanyCode),
                        new Filter("FiscalYear", FilterOperator.EQ , sFiscalYear),
                        new Filter("FiscalPeriod", FilterOperator.EQ , sFiscalPeriod),
                        new Filter("IsReversed", FilterOperator.EQ, false)
                    ];
                    /* 임시 역분개 강제 허용 2024/7/22
                    ,
                        new Filter("ReversalReferenceDocument", "EQ", "")
                    */ 

                    if(filteredDataWBS.length > 0){
                        aFilterGLI1.push(new Filter("WBSElementInternalID", FilterOperator.EQ, filteredDataWBS[0].WBSElementInternalID))
                    }else{
                        aFilterGLI1.push(new Filter("WBSElementInternalID", FilterOperator.NE, ""))
                    }

                    oResultsStep.forEach(element => {
                        aFilterGLI1.push(new Filter("GLAccount", "EQ", element.GLACCOUNT))
                    })

                    var aFilterGLI2 = [
                        new Filter("SourceLedger", FilterOperator.EQ, "0L"),
                        new Filter("CompanyCode", FilterOperator.EQ, sCompanyCode),
                        new Filter("FiscalYear", FilterOperator.EQ , sFiscalYear),
                        new Filter("IsReversed", FilterOperator.EQ, false)
                    ];
                    
                    /* 임시 역분개 강제 허용 2024/7/22
                    ,
                        new Filter("ReversalReferenceDocument", FilterOperator.EQ, ""), 
                    */
                    
                    if(filteredDataWBS.length > 0){
                        aFilterGLI2.push(new Filter("WBSElementInternalID", FilterOperator.EQ, filteredDataWBS[0].WBSElementInternalID))
                    }
                    
                    oResultsPost.forEach(element => {
                        aFilterGLI2.push(new Filter("AccountingDocument", FilterOperator.EQ, element.ACCOUNTINGDOCUMENT
                        ))
                    })

                    $.when(     
                        self._getODataModelRead(_oDataList["oGLACCOUNTITEM"],aFilterGLI1,sGLACCOUNTITEM_P,null),
                        self._getODataModelRead(_oDataList["oGLACCOUNTITEM"],aFilterGLI2,sGLACCOUNTITEM_P,null)
                    ).done(function(oResults, oResults2){
                        
                        var filteredDataDOC = [];
                        var aGroup = [];
                        var aGroupKey = [];
                        
                        oResults.forEach(elementRows => {
                            for (const row of oResultsStep) {
                                if (parseInt(row["GLACCOUNT"]) === parseInt(elementRows.GLAccount)) {
                                    elementRows.GroupKey = row.COSTGROUP + elementRows.WBSElementInternalID;
                                    elementRows.CostGroup = row.COSTGROUP
                                    elementRows.CostGroupText = row.COSTGROUPTEXT
                                    elementRows.WorkInProcessGL = row.WORKINPROCESSGL
                                    elementRows.CostElementGL = row.COSTELEMENTGL
                                    aGroupKey.push(elementRows);
                                    break;
                                }
                            }
                        });

                        var oResultsMSG = oResultsPost.reduce(function (total, item) {
                            var sKey = item.ACCOUNTINGDOCUMENT+item.GROUPKEY;
                            if (!total[sKey]) {
                               total[sKey] = [];
                            }
                            for (const row of oResults2) {
                                if (parseInt(row["CompanyCode"]) === parseInt(item.COMPANYCODE) 
                                && parseInt(row["FiscalYear"]) === parseInt(item.FISCALYEAR) 
                                && parseInt(row["FiscalPeriod"]) === parseInt(item.FISCALPERIOD) 
                                && parseInt(row["AccountingDocument"]) === parseInt(item.ACCOUNTINGDOCUMENT)
                                && total[sKey].length === 0) {
                                    total[sKey].push(item);
                                }
                            }
                            return total;
                         }, {});

                        Object.keys(oResultsMSG).forEach(function (key) {
                            if (oResultsMSG[key][0]){
                                filteredDataDOC.push(oResultsMSG[key][0]);
                            }                            
                        }.bind(self));
                        
                        oGLACCOUNTITEM.setProperty("/", oResults);
                        var aRows = oGLACCOUNTITEM.getProperty("/");

                        // WBSElementInternalID 기준 금액 SUM
                        aRows.forEach(elementRows => {

                            if(aGroup.length > 0){

                                // 조건에 일치하는 데이터 필터링
                                var vItem = aGroup.filter((item) => {
                                    return item.GroupKey == elementRows.GroupKey;
                                })

                                // 조건에 일치하는 데이터가 있다면
                                if(vItem.length > 0){
                                    var vAmount = parseInt(vItem[0].AmountInCompanyCodeCurrency);
                                    vAmount = parseInt(vAmount);
                                    vAmount = vAmount +  parseInt(elementRows.AmountInCompanyCodeCurrency);
                                    vItem[0].AmountInCompanyCodeCurrency = vAmount;

                                // 조건에 일치하는 데이터가 없다면
                                }else{
              
                                    var filteredDataWBS = oResultsWbs.filter(row => row["WBSElementInternalID"] === elementRows.WBSElementInternalID);
                                    if(filteredDataWBS.length === 0){
                                        var filteredData = {};
                                        filteredData.ProjectElement = "";
                                        filteredData.ProjectElementDescription = "";
                                        filteredDataWBS.push(filteredData);
                                    }
                                    var filteredDataMSG = filteredDataDOC.filter(row => parseInt(row["GROUPKEY"]) === parseInt(elementRows.GroupKey));
                                    if(filteredDataMSG.length === 0){
                                        var filteredData = {};
                                        filteredData.ACCOUNTINGDOCUMENT = "";
                                        filteredData.POSTINGDATE = "";
                                        filteredData.POSTINGMSG = "";
                                        filteredData.FiscalYearPeriod = "";
                                        filteredDataMSG.push(filteredData);
                                    }else{
                                        filteredDataMSG[0].FiscalYearPeriod = filteredDataMSG[0].FISCALYEAR+"/"+filteredDataMSG[0].FISCALPERIOD;
                                    }
                                    var newItem = {
                                        WBSElementInternalID : elementRows.WBSElementInternalID,
                                        WBSElement : filteredDataWBS[0].ProjectElement,
                                        WBSDescription : filteredDataWBS[0].ProjectElementDescription,
                                        CompanyCode : elementRows.CompanyCode,
                                        FiscalYear : elementRows.FiscalYear,
                                        FiscalPeriod : elementRows.FiscalPeriod,
                                        FiscalYearPeriod : filteredDataMSG[0].FiscalYearPeriod,
                                        AmountInCompanyCodeCurrency : elementRows.AmountInCompanyCodeCurrency,
                                        CompanyCodeCurrency : elementRows.CompanyCodeCurrency,
                                        NewAccountDocument : filteredDataMSG[0].ACCOUNTINGDOCUMENT,
                                        PostingMessage : filteredDataMSG[0].POSTINGMSG,
                                        GLAccount : elementRows.GLAccount,
                                        CostGroup : elementRows.CostGroup,
                                        CostGroupText : elementRows.CostGroupText,
                                        WorkInProcessGL : elementRows.WorkInProcessGL,
                                        CostElementGL :  elementRows.CostElementGL,
                                        GroupKey : elementRows.GroupKey
                                    }
                                    aGroup.push(newItem);
                                }
                            // 그룹이 없으면 새로 생성
                            }else{
                                var filteredDataWBS = oResultsWbs.filter(row => row["WBSElementInternalID"] === elementRows.WBSElementInternalID);
                                if(filteredDataWBS.length === 0){
                                    var filteredData = {};
                                    filteredData.ProjectElement = "";
                                    filteredData.ProjectElementDescription = "";
                                    filteredDataWBS.push(filteredData);
                                }
                                var filteredDataMSG = filteredDataDOC.filter(row => parseInt(row["GROUPKEY"]) === parseInt(elementRows.GroupKey));
                                if(filteredDataMSG.length === 0){
                                    var filteredData = {};
                                    filteredData.ACCOUNTINGDOCUMENT = "";
                                    filteredData.POSTINGDATE = "";
                                    filteredData.POSTINGMSG = "";
                                    filteredData.FiscalYearPeriod = "";
                                    filteredDataMSG.push(filteredData);
                                }else{
                                    filteredDataMSG[0].FiscalYearPeriod = filteredDataMSG[0].FISCALYEAR+"/"+filteredDataMSG[0].FISCALPERIOD;
                                }
                                var newItem = {
                                    WBSElementInternalID : elementRows.WBSElementInternalID,
                                    WBSElement : filteredDataWBS[0].ProjectElement,
                                    WBSDescription : filteredDataWBS[0].ProjectElementDescription,
                                    CompanyCode : elementRows.CompanyCode,
                                    FiscalYear : elementRows.FiscalYear,
                                    FiscalPeriod : elementRows.FiscalPeriod,
                                    FiscalYearPeriod : filteredDataMSG[0].FiscalYearPeriod,
                                    AmountInCompanyCodeCurrency : elementRows.AmountInCompanyCodeCurrency,
                                    CompanyCodeCurrency : elementRows.CompanyCodeCurrency,
                                    NewAccountDocument : filteredDataMSG[0].ACCOUNTINGDOCUMENT,
                                    PostingMessage : filteredDataMSG[0].POSTINGMSG,
                                    GLAccount : elementRows.GLAccount,
                                    CostGroup : elementRows.CostGroup,
                                    CostGroupText : elementRows.CostGroupText,
                                    WorkInProcessGL : elementRows.WorkInProcessGL,
                                    CostElementGL :  elementRows.CostElementGL,
                                    GroupKey : elementRows.GroupKey
                                }
                                aGroup.push(newItem);
                            }
                        })
                        
                        var sKey = "MSG_RESULT_SELECT";
                        switch (vEvent) {
                            case "SAVE":
                                sKey = "MSG_RESULT_UPDATE";
                                break;
                            case "DELETE":
                                sKey = "MSG_RESULT_DELETE";
                                break;
                            case "NULL":
                                sKey = "";
                                break;
                        }
                        if (sKey !== "") {
                            MessageToast.show(_i18n.getText(sKey));
                        }
      
                        var oGLACCOUNTData = self.getView().getModel('oGLACCOUNT').getData();

                        aGroup.forEach(function(oItemA) {

                            var aCOSTGLAccountText = oGLACCOUNTData.filter(function(oItem) {
                                return oItem.GLAccount === oItemA.CostElementGL;
                            });
                            oItemA.CostElementGLText = aCOSTGLAccountText[0].GLAccountName;
                    
                            var aWIPGLAccount = oGLACCOUNTData.filter(function(oItem) {
                                return oItem.GLAccount === oItemA.WorkInProcessGL;
                            });
                            oItemA.WorkInProcessGLText = aWIPGLAccount[0].GLAccountName;
                            
                        });

                        var aGroupF = [];

                        if(sNewAccountDocument === "true"){
                            aGroup.forEach(elementRows => {
                                if(elementRows.NewAccountDocument !== ""){
                                    aGroupF.push(elementRows);
                                }
                            });
                        }else if(sNewAccountDocument === "false"){
                            aGroup.forEach(elementRows => {
                                if(elementRows.NewAccountDocument === ""){
                                    aGroupF.push(elementRows);
                                }
                            });
                        }else{
                            aGroupF = aGroup;
                        }

                         // 0원 제외
                         if(vZeroExcept){
                            aGroupF = aGroupF.filter(function(oItem) {
                                return oItem.AmountInCompanyCodeCurrency != 0;
                            });
                        }

                        _oTable.setSelectedIndex(-1);
                        _oViewTableModel.setProperty("/", aGroupF);
                        _oLayout.setProperty("/tableCnt", aGroupF.length);
                        _oLayout.setProperty("/exportVisible", true);
                        _oTable.setBusy(false);

                    });

                });
                

            },

            /**
             * 코드 입력값에 대한 검증
             * @param {*} oEvent 
             * @param {*} vFieldName 
             */
            onCodeListCheck : function(oEvent, vFieldName) {
                var sValue = oEvent.getParameters().value;
                 
                var sKey = "", oDataName = "o"+vFieldName;
                switch (vFieldName) {
                    case "COMPANYCODE" :
                        sKey = "CompanyCode"; 
                        break;
                    case "WBSElement" :
                        sKey = "ProjectElement";
                        break;
                }
                
                if(this[oDataName]) {
                    var aCodeList = this[oDataName] || [],
                        bCodeListIndex;
                    
                    bCodeListIndex = aCodeList.map(function(item, idx){
                        return item[sKey];
                    }).indexOf(sValue);
                    
                    if(bCodeListIndex < 0) {
                        MessageToast.show(_i18n.getText("MSG_CHECK_VH"));
                        oEvent.getSource().setValue("");
                    } 
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
                    case "CompanyCode":
                        oParamer = {
                            title : "{i18n>COMPANYCODE}", 
                            EntitySet : "oCOMPANYCODE>/", 
                            TitleProperty : "{oCOMPANYCODE>CompanyCode}",
                            DescriptionProperty : "{oCOMPANYCODE>CompanyCodeName}",
                            TitleFilterField : "CompanyCode",
                            DescFilterField : "CompanyCodeName"
                        };
                        // aFilter.push(new Filter("Language", "EQ", "KO"));
                        break;	

                        case "WBSElement":
                        oParamer = {
                            title : "{i18n>WBSElement}", 
                            EntitySet : "oWBSELEMENT>/", 
                            TitleProperty : "{oWBSELEMENT>ProjectElement}",
                            DescriptionProperty : "{oWBSELEMENT>ProjectElementDescription}",
                            TitleFilterField : "ProjectElement",
                            DescFilterField : "ProjectElementDescription"
                        };
                        break;	

                }
                this._openSearchDialog(oParamer, aFilter, function(e){
                    var oDialog = e.getSource();
                    oInput.setValue(oDialog.getTitle());                     
                });
            },

            /**
             * 버튼제어
             * @param {*} oView 
             */

            onCancel: function() {
                var self = this;
                sap.m.MessageBox.confirm(_i18n.getText("CONFIRM_POST_CREATION"), {
                    title: _i18n.getText("CANCEL_CONFIRMATION"),
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: function(oAction) {
                        if (oAction === sap.m.MessageBox.Action.YES) {
                            self.resetToInitialState();
                        }
                    }
                });
            },

            onPost: function() {
                var self = this; 

                var oTable = self.getView().byId("iWBSGLACCOUNTList");
                oTable.setBusy(true);
                
                sap.m.MessageBox.confirm(_i18n.getText("CONFIRM_SIMULATION"), {
                    title: _i18n.getText("SIMULATION_PROGRESS"),
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: function(oAction) {
                        if (oAction === sap.m.MessageBox.Action.YES) {
                            self.proceedWithPost();
                        } else {
                            oTable.setBusy(false);
                        }
                        
                    }
                });
            },

            onSave: function() {
                var self = this;
                MessageBox.confirm(_i18n.getText("CONFIRM_POST"), {
                    title: _i18n.getText("POST_PROGRESS"),
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    onClose: function(sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            self.callSoapApi();
                        }
                    }
                });
            },

            /**
             * CRUD
             * @param {*} oView 
             */
            
            //전표 SOAP API 호출
            callSoapApi: function() {
                var self = this;
                var oView = this.getView();
                var oCreateGLModel = oView.getModel("oCreateGL");
                var aData = oCreateGLModel.getData();

                var oCOMMUNICATION = oView.getModel('oCOMMUNICATION');
                var oInterface = oCOMMUNICATION.getData().filter(function(item) {
                    return item.USER_ID === "BTP_USER";
                });             
                oInterface = oInterface[0];
            
                var iSuccessCount = 0;
                var iErrorCount = 0;
                var aErrorMessages = [];
                var CreationDateTime = self.getFormattedDate();
            
                self._getODataModelRead(_oDataList["oPOSTING"]).done(function(aExistingData) {
                    var sUrl = "/sap/bc/srt/scs_ext/sap/journalentrycreaterequestconfi?MessageId=989C6E5C-2CC1-11CA-A044-08002B1BB4F5";
                    var vDocumentDate = aData[0].FiscalPeriod;
                    var vEndOfMonth = self.getLastDayOfMonth(vDocumentDate);
                    var vYear = self.getView().byId('fbFiscalYear').getValue();
                    var oUser = sap.ushell.Container.getService("UserInfo").getUser();
                    var userId = oUser.getId();
                    var vHeaderText = vYear + '.' + vDocumentDate + " 재공품 대체";
                    //var vItemText = aData[0].WBSElement + ' ' +(aData[0].WBSDescription).replaceAll('&','&amp;');
                    var sRequest = `
                        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN" xmlns:yy1="http://SAPCustomFields.com/YY1_">
                            <soapenv:Header/>
                            <soapenv:Body>
                                <sfin:JournalEntryBulkCreateRequest>
                                    <MessageHeader>
                                        <CreationDateTime>${CreationDateTime}</CreationDateTime>
                                    </MessageHeader>
                                    <JournalEntryCreateRequest>
                                        <MessageHeader>
                                            <CreationDateTime>${CreationDateTime}</CreationDateTime>
                                        </MessageHeader>
                                        <JournalEntry>
                                            <OriginalReferenceDocumentType>BKPFF</OriginalReferenceDocumentType>
                                            <BusinessTransactionType>RFBU</BusinessTransactionType>
                                            <AccountingDocumentType>SA</AccountingDocumentType>
                                            <DocumentHeaderText>${vHeaderText}</DocumentHeaderText>
                                            <CreatedByUser>${userId}</CreatedByUser>
                                            <CompanyCode>${aData[0].CompanyCode}</CompanyCode>
                                            <DocumentDate>${vEndOfMonth}</DocumentDate>
                                            <PostingDate>${vEndOfMonth}</PostingDate>
                                            <TaxDeterminationDate>${vEndOfMonth}</TaxDeterminationDate>
                                            ${aData.map((oData, index) => `
                                                <Item>
                                                    <ReferenceDocumentItem>${index * 2 + 1}</ReferenceDocumentItem>
                                                    <CompanyCode>${oData.CompanyCode}</CompanyCode>
                                                    <GLAccount listID="">${oData.WIP_GL}</GLAccount>
                                                    <AmountInTransactionCurrency currencyCode="${oData.CompanyCodeCurrency}">${oData.AmountInCompanyCodeCurrency > 0 ? Math.abs(oData.AmountInCompanyCodeCurrency) : -Math.abs(oData.AmountInCompanyCodeCurrency)}</AmountInTransactionCurrency>
                                                    <DebitCreditCode>${oData.AmountInCompanyCodeCurrency > 0 ? 'S' : 'H'}</DebitCreditCode>
                                                    <DocumentItemText>${oData.WBSElement} ${oData.WBSDescription.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</DocumentItemText>
                                                    <AccountAssignment>
                                                        <WBSElement>${oData.WBSElement}</WBSElement>
                                                    </AccountAssignment>
                                                </Item>
                                                <Item>
                                                    <ReferenceDocumentItem>${index * 2 + 2}</ReferenceDocumentItem>
                                                    <CompanyCode>${oData.CompanyCode}</CompanyCode>
                                                    <GLAccount listID="YCOA">${oData.COST_GL}</GLAccount>
                                                    <AmountInTransactionCurrency currencyCode="${oData.CompanyCodeCurrency}">${oData.AmountInCompanyCodeCurrency > 0 ? -Math.abs(oData.AmountInCompanyCodeCurrency) : Math.abs(oData.AmountInCompanyCodeCurrency)}</AmountInTransactionCurrency>
                                                    <DebitCreditCode>${oData.AmountInCompanyCodeCurrency > 0 ? 'H' : 'S'}</DebitCreditCode>
                                                    <DocumentItemText>${oData.WBSElement} ${oData.WBSDescription.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</DocumentItemText>
                                                    <AccountAssignment>
                                                        <WBSElement>${oData.WBSElement}</WBSElement>
                                                    </AccountAssignment>
                                                </Item>
                                            `).join('')}
                                        </JournalEntry>
                                    </JournalEntryCreateRequest>
                                </sfin:JournalEntryBulkCreateRequest>
                            </soapenv:Body>
                        </soapenv:Envelope>`;
            
                    // SOAP API 호출
                    jQuery.ajax({
                        url: sUrl,
                        type: "POST",
                        data: sRequest,
                        dataType: "xml",
                        contentType: "text/xml; charset=utf-8",
                        headers: {
                            "Origin-Agent-Cluster": "?1",
                            "Authorization": "Basic " + btoa(`${oInterface.USER_ID}:${oInterface.USER_PW}`)
                        },
                        success: function(data, textStatus, jqXHR) {
                            console.log(data, jqXHR);
                            var sResponseMessage = jqXHR.responseText;
                            var parser = new DOMParser();
                            var xmlDoc = parser.parseFromString(sResponseMessage, "text/xml");
                            var notes = xmlDoc.getElementsByTagName("Note");
                            var noteContents = [];
                            for (var i = 0; i < notes.length; i++) {
                                noteContents.push(notes[i].textContent);
                            }
                            var sDocumentNumber = jQuery(data).find("DocumentNumber").text();
                            var combinedNotes = noteContents.join(" ");
                            var parser = new DOMParser();
                            var xmlDoc = parser.parseFromString(sRequest, "text/xml");
                            var vPostingDate = xmlDoc.getElementsByTagName('PostingDate')[0].textContent + "T00:00:00";
                            var sFiscalPeriod = self.byId("fbFiscalPeriod").getSelectedKey();
                            if (sFiscalPeriod) {
                                if (sFiscalPeriod.length === 1) {
                                    sFiscalPeriod = '00' + sFiscalPeriod;
                                } else if (sFiscalPeriod.length === 2) {
                                    sFiscalPeriod = '0' + sFiscalPeriod;
                                }
                            }
                
                            // aData 배열을 순회하면서 각 요소에 대해 CBO에 데이터 저장
                            aData.forEach(function(oDataItem ,idx) {
                                var oData = {};
                                oData.COMPANYCODE = oDataItem.CompanyCode;
                                oData.FISCALYEAR = data.documentElement.getElementsByTagName('FiscalYear')[0].textContent;
                                oData.FISCALPERIOD = sFiscalPeriod;
                                oData.PROGRAMID = '1';
                                oData.WBSELEMENT = oDataItem.WBSElement;
                                oData.WBSELEMENTINTERNALID = oDataItem.WBSElementInternalID;
                                oData.GROUPKEY = oDataItem.GroupKey;
                                oData.TOTALAMOUNT = oDataItem.TotalAmount;
                                oData.ACCOUNTINGDOCUMENT = data.documentElement.getElementsByTagName('AccountingDocument')[0].textContent;
                                oData.POSTINGDATE = vPostingDate;
                                oData.POSTINGMSG = data.documentElement.getElementsByTagName('Note')[0].textContent;
                        
                                // CBO에서 동일한 키 값을 가진 데이터 확인
                                var aFilteredData = aExistingData.filter(function(item) {
                                    return item.COMPANYCODE === oData.COMPANYCODE &&
                                        item.FISCALYEAR === oData.FISCALYEAR &&
                                        item.WBSELEMENTINTERNALID === oData.WBSELEMENTINTERNALID &&

                                        item.FISCALPERIOD === oData.FISCALPERIOD &&
                                        item.PROGRAMID === oData.PROGRAMID &&
                                        item.GROUPKEY === oData.GROUPKEY;
                                });
                        
                                if (aFilteredData.length > 0) {
                                    // 동일한 키 값이 존재하는 경우 삭제 후 생성 처리
                                    var oExistingData = aFilteredData[0];
                                    var sUuid = oExistingData.SAP_UUID;
                                    self._getODataDelete(_oDataList["oPOSTING"], `/YY1_ZCOSTPOSTING(guid'${sUuid}')`, oData).done(function() {
                                        self.getODataCreateDiy(_oDataList["oPOSTING"], _oDataList["oPOSTING"].oEntitySet, oData, aData.length, idx);
                                    });
                                } else {
                                    // 동일한 키 값이 존재하지 않는 경우 생성 처리
                                    self.getODataCreateDiy(_oDataList["oPOSTING"], _oDataList["oPOSTING"].oEntitySet, oData, aData.length, idx);
                                }
                            });
                            var sMessage = _i18n.getText("NOTES") + "\n" + data.documentElement.getElementsByTagName('Note')[0].textContent;

                            MessageBox.show(sMessage, {
                                title: _i18n.getText("POST_CREATION_RESULT"),
                                actions: [MessageBox.Action.OK]
                            });

                            self.resetToInitialState();
                            //self.performSearch();
                        },
                        error: function(jqXHR) {
                            var sErrorMessage = jQuery(jqXHR.responseXML).find("message").text();
                            console.error("SOAP API 호출 실패:", sErrorMessage);
                        }
                    });
                });
            },
            
            // 원가 그룹 별 WBS 매핑
            proceedWithPost: function() {
                var self = this;
                var oView = this.getView();
                var oTable = oView.byId("iWBSGLACCOUNTList");
                var aSelectedIndices = oTable.getSelectedIndices();
                var aSelectedData = aSelectedIndices.map(function(iIndex) {
                  return oTable.getContextByIndex(iIndex).getObject();
                });
              
                // NewAccountDocument 필드에 데이터가 있는지 확인
                var aPostedDocuments = aSelectedData.filter(function(oItem) {
                  return oItem.NewAccountDocument;
                });
              
                if (aPostedDocuments.length > 0) {
                    var wbsElements = aPostedDocuments.map(function(oItem) {
                        return oItem.WBSElement;
                    }).join(", ");
                    var sMessage = _i18n.getText("DOCUMENT_EXISTS") + "\n\n";
                    sMessage += _i18n.getText("RELATED_WBS_ELEMENTS", [wbsElements]);
                    MessageBox.warning(sMessage, {});
                    oTable.setBusy(false);
                    return;
                }
              
                var sCompanyCode = self.byId("fbCompanyCode").getSelectedKey();
                var oCreateGLModel = oView.getModel("oCreateGL");
                oCreateGLModel.setData(aSelectedData);
              
                var oGLACCOUNTData = self.getView().getModel('oGLACCOUNT').getData();
              
                var oJoinedData = [];
                var aUnmatchedDocuments = [];

           
              
                aSelectedData.forEach(function(oItemA) {

                    if (oItemA.CostElementGL && oItemA.WorkInProcessGL) {
                            var oJoinedItem = {
                            AccountingDocument: oItemA.AccountingDocument,
                            LedgerGLLineItem: oItemA.LedgerGLLineItem,
                            WBSElement: oItemA.WBSElement,
                            WBSDescription: oItemA.WBSDescription,
                            AmountInCompanyCodeCurrency: oItemA.AmountInCompanyCodeCurrency,
                            CompanyCodeCurrency: oItemA.CompanyCodeCurrency,
                            WIP_GL: oItemA.WorkInProcessGL,
                            WIP_GLTEXT: oItemA.WorkInProcessGLText,
                            COST_GL: oItemA.CostElementGL,
                            COST_GLTEXT: oItemA.CostElementGLText,
                            FiscalPeriod: oItemA.FiscalPeriod,
                            CompanyCode: oItemA.CompanyCode,
                            GroupKey : oItemA.GroupKey,
                            WBSElementInternalID: oItemA.WBSElementInternalID
                            };
                    
                            oJoinedData.push(oJoinedItem);
                  } else {
                    aUnmatchedDocuments.push(oItemA.WBSElement);
                  }
                });
              
                if (aUnmatchedDocuments.length > 0) {
                    var unmatchedDocumentsStr = aUnmatchedDocuments.join(", ");
                    var sMessage = _i18n.getText("DATA_NOT_FOUND", [unmatchedDocumentsStr]);
                    MessageBox.warning(sMessage, {});
                }
              
                oCreateGLModel.setData(oJoinedData);
                oCreateGLModel.refresh();
                _oLayout.setProperty("/createTableCnt", oCreateGLModel.getData().length);
                self.byId("iCreateGLTable").setVisible(true);
              
                var oPostButton = self.getView().byId("iPOSTButton");
                var oSaveButton = self.getView().byId("iSaveButton");
                var oCancelButton = self.getView().byId("iCancelButton");
              
                self.getView().byId('page').setShowFooter(!self.getView().byId('page').getShowFooter());
                oPostButton.setVisible(false);
                oSaveButton.setVisible(true);
                oCancelButton.setVisible(true);
            },

            // 테이블 관련 로직
            onSelectionRow: function(oEvent) {
                var oTable = this.getView().byId("iWBSGLACCOUNTList");
                var aSelectedIndices = oTable.getSelectedIndices();
                var oPostButton = this.getView().byId("iPOSTButton");
                oPostButton.setEnabled(aSelectedIndices.length > 0);
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

                    if(!sProperty){
                        var sItems = col.getTemplate().mAggregations.items[0];
                        
                        var sProperty = sItems.getBindingPath("text");

                        if(!sProperty) {
                            sProperty = sItems.getBindingPath("value");
                        }
                    }

                    var sText = "";
                    if(col.getLabel() === null) {
                        sText = col.getMultiLabels()[0].getText().trim();
                    } else {
                        sText = col.getLabel().getText();
                    }
                    
                    // 숫자 필드에 대한 쉼표 처리
                    if(col.getLabel().getText().indexOf("금액") > 0 ){
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

            /**
             * 생성 - 전치리 없음
             * @param {*} oModel 
             * @param {*} readContext 
             * @param {*} oData 
             * @returns 
             */
            getODataCreateDiy: function(oModel, readContext, oData, mCnt, cCnt) {
                var deferred = $.Deferred();
                var self = this;
            
                var odataModel = new ODataModel(oModel.oModel);
            
                // Fetch CSRF token first
                odataModel.refreshSecurityToken(function(sToken, oResponse) {
                    // The token is fetched, now make the CREATE request with the token
                    odataModel.create(readContext, oData, {
                        headers: {
                            // Include the fetched CSRF token in the CREATE request header
                            'X-CSRF-Token': oResponse.headers['x-csrf-token']
                        },
                        success: function(oReturn) {
                            var aResult = oReturn.results;
                            if(mCnt == cCnt+1){
                                self.performSearch();
                            }
                            deferred.resolve(aResult);
                        },
                        error: function(oError) {
                            var aResult = "E";
                            deferred.resolve(aResult);
                            try {
                                var oResponseTextData = JSON.parse(oError.responseText);
                                MessageToast.show(oResponseTextData.error.message.value);
                            } catch (e) {
                                MessageToast.show(oError.message + "_" + oError.statusCode);
                            }
                        }
                    });
                }, function(oError) {
                    deferred.reject(oError);
                    MessageToast.show("Failed to fetch CSRF token");
                }, true);
            
                return deferred.promise();
            }

           
        });
    });