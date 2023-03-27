import {error} from "@actions/core";

const core = require('@actions/core');
const axios = require('axios');
const moment = require('moment');

export const run = () => {
    try {
        let globalAnnotation = true;
        const grafanaHost = core.getInput("grafanaHost", {required: true});
        const grafanaToken = core.getInput("grafanaToken", {required: true});
        const grafanaTags = core.getInput("grafanaTags").split("\n").filter(x => x !== "");
        const grafanaDashboardID = Number.parseInt(core.getInput("grafanaDashboardID"), 10) || undefined;
        const grafanaPanelID = Number.parseInt(core.getInput("grafanaPanelID"),10) || undefined;
        const grafanaAnnotationID = Number.parseInt(core.getInput("grafanaAnnotationID"), 10) || undefined;
        const grafanaText = core.getInput("grafanaText", {required: grafanaAnnotationID === undefined});

        let headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${grafanaToken}`
        };

        if (grafanaAnnotationID === undefined) {
            console.log("creating a new annotation")

            if ((grafanaDashboardID === undefined && grafanaPanelID !== undefined) ||
                (grafanaDashboardID !== undefined && grafanaPanelID === undefined)) {
                return error('must supply both grafanaDashboardID, grafanaPanelID or none.')
            }

            if (grafanaDashboardID !== undefined && grafanaPanelID !== undefined) {
                console.log("Dashboard and panel specified, non global annotation will be created.")
                globalAnnotation = false
            }

            let payload = {
                tags: grafanaTags,
                text: grafanaText
            };

            if (!globalAnnotation) {
                payload.dashboardId = grafanaDashboardID;
                payload.panelId = grafanaPanelID;
            }

            console.log("payload: " + JSON.stringify(payload));

            axios.post(
                `${grafanaHost}/api/annotations`,
                payload,
                {
                    headers: headers
                }
            ).then((response) => {
                if (response.status !== 200) {
                    console.warn("non 200 status code from post /api/annotations: " + response.status)
                    core.setFailed("post request had failed");
                }

                const annotationId = response.data.id;
                console.log(`successfully created an annotation with the following id [${annotationId}]`)
                core.setOutput("annotation-id", annotationId);
            }).catch((err) => {
                console.error(err);
                core.setFailed(err.message);
            });

        } else {
            console.log("updating the end time of existing annotation");
            let payload = {
                timeEnd: moment.now().valueOf()
            };
            if (grafanaTags) {
                payload.tags = grafanaTags
            }

            console.log(`updating the 'time-end' of annotation [${grafanaAnnotationID}]`);
            axios.patch(
                `${grafanaHost}/api/annotations/${grafanaAnnotationID}`,
                payload,
                {
                    headers: headers
                }
            ).then((response) => {
                if (response.status !== 200) {
                    console.warn("non 200 status code from patch /api/annotations: " + response.status)
                    core.setFailed("patch request had failed");
                }
                console.log("successfully updated the annotation with time-end");
            }).catch((err) => {
                console.error(err);
                core.setFailed(err.message);
            });
        }
    } catch (error) {
        core.setFailed(error.message);
    }
};

run();
