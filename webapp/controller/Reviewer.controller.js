sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, JSONModel, Filter, FilterOperator) => {
    "use strict";

    const TITLE_BY_LEVEL = {
        FirstLevel: "1st Level Reviewer",
        SecondLevel: "2nd Level Reviewer",
        EscalationManager: "Escalation Manager"
    };
    const ROLE_BY_LEVEL = {
        FirstLevel: "FirstLevelReviewer",
        SecondLevel: "SecondLevelReviewer",
        EscalationManager: "EscalationManager"
    };
    const DECISION_STATE = {
        Pending: "Warning",
        Approved: "Success",
        Rejected: "Error",
        Escalated: "Information"
    };

    return Controller.extend("aidcm.controller.Reviewer", {
        onInit() {
            this.getView().setModel(this.getOwnerComponent().getModel("session"), "session");
            this.getView().setModel(new JSONModel({ title: "" }), "page");
            this.getOwnerComponent().getRouter().getRoute("RouteReview").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched(oEvent) {
            const sLevel = oEvent.getParameter("arguments").level;
            const sExpectedRole = ROLE_BY_LEVEL[sLevel];
            const oSession = this.getOwnerComponent().getModel("session").getData();

            if (!sExpectedRole || oSession.role !== sExpectedRole) {
                this.getOwnerComponent().getRouter().navTo("RouteLogin");
                return;
            }

            this._sLevel = sLevel;
            this.getView().getModel("page").setProperty("/title", `${TITLE_BY_LEVEL[sLevel]} Dashboard`);

            const oBinding = this.byId("reviewTable").getBinding("items");
            oBinding.filter(new Filter("reviewLevel", FilterOperator.EQ, sLevel));
        },

        formatDecisionState(sDecision) {
            return DECISION_STATE[sDecision] || "None";
        },

        async _decide(oEvent, sDecision) {
            const oContext = oEvent.getSource().getBindingContext("review");
            const oBinding = this.getView().getModel("review").bindContext("/decide(...)");
            oBinding.setParameter("ID", oContext.getProperty("ID"));
            oBinding.setParameter("decision", sDecision);
            oBinding.setParameter("reasonForApproval", oContext.getProperty("reasonForApproval"));
            oBinding.setParameter("comments", oContext.getProperty("comments"));
            oBinding.setParameter("actorEmail", this.getOwnerComponent().getModel("session").getProperty("/email"));
            await oBinding.execute();

            this.byId("reviewTable").getBinding("items").refresh();
        },

        onApprove(oEvent) {
            this._decide(oEvent, "Approved");
        },
        onReject(oEvent) {
            this._decide(oEvent, "Rejected");
        },
        onEscalate(oEvent) {
            this._decide(oEvent, "Escalated");
        },

        onLogout() {
            this.getOwnerComponent().getModel("session").setData({});
            // eslint-disable-next-line @sap-ux/fiori-tools/sap-no-sessionstorage -- see Component.js
            sessionStorage.removeItem("aidcmSession");
            this.getOwnerComponent().getRouter().navTo("RouteLogin");
        }
    });
});
