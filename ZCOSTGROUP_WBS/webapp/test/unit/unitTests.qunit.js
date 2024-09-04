/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zcostgroup_wbs/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
