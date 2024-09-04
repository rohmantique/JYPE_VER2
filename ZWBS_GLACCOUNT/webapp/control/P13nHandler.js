// P13nHandler.js
sap.ui.define([
    'sap/m/p13n/Engine',
    'sap/m/p13n/SelectionController',
    'sap/m/p13n/SortController',
    'sap/m/p13n/GroupController',
    'sap/m/p13n/MetadataHelper',
    'sap/ui/model/Sorter',
    'sap/ui/core/library',
    'sap/m/table/ColumnWidthController'
], function(Engine, SelectionController, SortController, GroupController, MetadataHelper, Sorter, CoreLibrary, ColumnWidthController) {
    "use strict";

    return {
        registerForP13n: function(oTable, oMetadataHelper, oComponent) {
            Engine.getInstance().register(oTable, {
                helper: oMetadataHelper,
                controller: {
                    Columns: new SelectionController({
                        targetAggregation: "columns",
                        control: oTable
                    }),
                    Sorter: new SortController({
                        control: oTable
                    }),
                    Groups: new GroupController({
                        control: oTable
                    }),
                    ColumnWidth: new ColumnWidthController({
                        control: oTable
                    })
                }
            });

            Engine.getInstance().attachStateChange(this.handleStateChange.bind(this, oTable, oMetadataHelper, oComponent));
        },

        handleStateChange: function(oTable, oMetadataHelper, oComponent, oEvt) {
            const oState = oEvt.getParameter("state");
            var sComponentId = oComponent.getId();
            const oId  = sComponentId + "---Main--";
            if (!oState) {
                return;
            }

            oTable.getColumns().forEach(function(oColumn) {
                // const sKey = oColumn.getId();
                const sKey = oColumn.getParent().getParent().getParent().getParent().getLocalId(oColumn.getId());
                const sColumnWidth = oState.ColumnWidth[sKey];

                oColumn.setWidth(sColumnWidth || "");
                oColumn.setVisible(false);
                oColumn.setSortOrder(CoreLibrary.SortOrder.None);
            });

            oState.Columns.forEach(function(oProp, iIndex) {
                const oCol = sap.ui.getCore().byId(oId + oProp.key);
                oCol.setVisible(true);

                oTable.removeColumn(oCol);
                oTable.insertColumn(oCol, iIndex);
            });

            const aSorter = [];
            oState.Sorter.forEach(function(oSorter) {
                const oColumn = sap.ui.getCore().byId(oId + oSorter.key);
                oColumn.setSorted(true);
                oColumn.setSortOrder(oSorter.descending ? CoreLibrary.SortOrder.Descending : CoreLibrary.SortOrder.Ascending);
                aSorter.push(new Sorter(oMetadataHelper.getProperty(oSorter.key).path, oSorter.descending));
            });
            oTable.getBinding("rows").sort(aSorter);
        }
    };
});