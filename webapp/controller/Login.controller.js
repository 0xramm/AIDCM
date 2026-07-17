sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    const ROUTE_BY_ROLE = {
        Administrator: () => ({ route: "RouteAdmin" }),
        FirstLevelReviewer: () => ({ route: "RouteReview", args: { level: "FirstLevel" } }),
        SecondLevelReviewer: () => ({ route: "RouteReview", args: { level: "SecondLevel" } }),
        EscalationManager: () => ({ route: "RouteReview", args: { level: "EscalationManager" } })
    };

    return Controller.extend("aidcm.controller.Login", {
        onInit() {
            this.getView().setModel(new JSONModel({ email: "", password: "", error: "", busy: false }), "login");
        },

        async onLogin() {
            const oLoginModel = this.getView().getModel("login");
            const { email, password } = oLoginModel.getData();
            oLoginModel.setProperty("/error", "");
            oLoginModel.setProperty("/busy", true);

            try {
                const oBinding = this.getView().getModel("auth").bindContext("/login(...)");
                oBinding.setParameter("email", email);
                oBinding.setParameter("password", password);
                await oBinding.execute();

                const oUser = oBinding.getBoundContext().getObject();
                this.getOwnerComponent().getModel("session").setData(oUser);

                const fnTarget = ROUTE_BY_ROLE[oUser.role];
                if (!fnTarget) {
                    throw new Error(`Unknown role: ${oUser.role}`);
                }
                const { route, args } = fnTarget();
                this.getOwnerComponent().getRouter().navTo(route, args || {});
            } catch {
                oLoginModel.setProperty("/error", "Invalid email or password.");
            } finally {
                oLoginModel.setProperty("/busy", false);
            }
        }
    });
});
