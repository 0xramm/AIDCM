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

            // holds the logged-in user (ID, email, fullName, role) for role-based routing/guards.
            // Backed by sessionStorage (set by Login, cleared by Logout) so a reload doesn't
            // bounce the user back to the login page. Fiori tools flags any storage API as a
            // security risk (apps sharing an FLP origin) — narrow, deliberate exception here:
            // this only holds non-sensitive prototype login data, per-tab, auto-cleared on close.
            // Swap for a real XSUAA/SSO session once Phase 6 auth hardening lands.
            // eslint-disable-next-line @sap-ux/fiori-tools/sap-no-sessionstorage
            const oStoredSession = JSON.parse(sessionStorage.getItem("aidcmSession") || "{}");
            this.setModel(new JSONModel(oStoredSession), "session");

            // enable routing
            this.getRouter().initialize();
        }
    });
});