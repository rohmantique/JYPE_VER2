/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zwbs_gla_step_3/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
