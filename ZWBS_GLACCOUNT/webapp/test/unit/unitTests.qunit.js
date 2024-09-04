/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"wbs_glaccount/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
