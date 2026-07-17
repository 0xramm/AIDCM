sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "aidcm/model/models"
], (UIComponent, JSONModel, models) => {
    "use strict";

    return UIComponent.extend("aidcm.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // holds the logged-in user (ID, email, fullName, role) for role-based routing/guards
            this.setModel(new JSONModel({}), "session");

            // enable routing
            this.getRouter().initialize();
        }
    });
});