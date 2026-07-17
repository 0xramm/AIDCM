sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], (Controller, MessageToast) => {
    "use strict";

    return Controller.extend("aidcm.controller.Admin", {
        onInit() {
            this.getView().setModel(this.getOwnerComponent().getModel("session"), "session");
            this.getOwnerComponent().getRouter().getRoute("RouteAdmin").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            const oSession = this.getOwnerComponent().getModel("session").getData();
            if (oSession.role !== "Administrator") {
                this.getOwnerComponent().getRouter().navTo("RouteLogin");
            }
        },

        _addRow(sTableId, oDefaults) {
            this.byId(sTableId).getBinding("items").create(oDefaults);
        },

        onAddSector() {
            this._addRow("sectorsTable", { name: "New Sector" });
        },
        onAddRegion() {
            this._addRow("regionsTable", { code: "", name: "New Region" });
        },
        onAddSystem() {
            this._addRow("systemsTable", { name: "New System", connectionType: "DirectDB" });
        },
        onAddControl() {
            this._addRow("controlsTable", { code: "", description: "", ruleLogic: "rolesProfiles == ''" });
        },
        onAddMapping() {
            this._addRow("mappingTable", { active: true });
        },

        onDeleteRow(oEvent) {
            oEvent.getSource().getBindingContext("admin").delete();
        },

        // ponytail: the mapping dropdowns (Business Sector/Region/System/Control Selects)
        // are separate list bindings from the master-data tables, so they go stale after
        // an add/delete elsewhere. Refreshing on every write raced with in-progress edits
        // (a create()'s auto-refresh could revert a rename typed right after). Refreshing
        // only when the Mapping tab is opened avoids that race and is good enough here.
        onTabSelect(oEvent) {
            if (oEvent.getParameter("key") === "mapping") {
                this.getView().getModel("admin").refresh();
            }
        },

        async onRunControlScan() {
            const oBinding = this.getView().getModel("review").bindContext("/runControlScan(...)");
            await oBinding.execute();
            const iCreated = oBinding.getBoundContext().getObject().value;
            MessageToast.show(`Control scan complete: ${iCreated} new review record(s) created.`);
        },

        onLogout() {
            this.getOwnerComponent().getModel("session").setData({});
            // eslint-disable-next-line @sap-ux/fiori-tools/sap-no-sessionstorage -- see Component.js
            sessionStorage.removeItem("aidcmSession");
            this.getOwnerComponent().getRouter().navTo("RouteLogin");
        }
    });
});
