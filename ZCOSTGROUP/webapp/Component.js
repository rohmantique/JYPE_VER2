/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "zcostgroup/model/models",
        "sap/ui/model/odata/v2/ODataModel"
    ],
    function (UIComponent, Device, models, ODataModel) {
        "use strict";

        return UIComponent.extend("zcostgroup.Component", {
            metadata: {
                manifest: "json",
                config: { 
                    fullWidth : true
                }
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                //모델생성
                //var oModel_main = new ODataModel("/sap/opu/odata/sap/YY1_ZCOSTGROUP_CDS/");
                //this.setModel(oModel_main, "oModel_main");

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
            }
        });
    }
);