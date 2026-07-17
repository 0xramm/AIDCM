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
            const oContext = this.byId(sTableId).getBinding("items").create(oDefaults);
            // ponytail: the mapping dropdowns are separate list bindings to the same
            // /Controls, /Systems, etc. paths — they don't see writes from this table's
            // binding until the model is refreshed. Fine at this data volume.
            oContext.created().then(() => this.getView().getModel("admin").refresh());
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
            oEvent.getSource().getBindingContext("admin").delete()
                .then(() => this.getView().getModel("admin").refresh());
        },

        async onRunControlScan() {
            const oBinding = this.getView().getModel("review").bindContext("/runControlScan(...)");
            await oBinding.execute();
            const iCreated = oBinding.getBoundContext().getObject().value;
            MessageToast.show(`Control scan complete: ${iCreated} new review record(s) created.`);
        },

        onLogout() {
            this.getOwnerComponent().getModel("session").setData({});
            this.getOwnerComponent().getRouter().navTo("RouteLogin");
        }
    });
});
