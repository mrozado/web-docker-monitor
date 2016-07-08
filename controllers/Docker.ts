import * as Express from "express";
import {Controller, DocController, DocAction, Get, Post, ExpressCompatible, Context} from "kwyjibo";
import * as K from "kwyjibo";
import * as Dockerode from "dockerode";
import * as Parser from "ansi-style-parser";
import * as Stream from "stream";

@Controller("/docker")
@DocController("Docker operations controller.")
class Docker {
    private dockerAPI: Dockerode = undefined;

    constructor() {
        this.dockerAPI = new Dockerode({ socketPath: "/var/run/docker.sock" });
    }

    @DocAction(`Lists existing containers`)
    containers(context: Context): void {
        this.dockerAPI.listContainers({ all: true }, (err, containers) => {
            context.response.render("containersList", { model: containers });
        });
    }

    @DocAction(`Shows the logs for the container with the id sent in the querystring`)
    logs(context: Context): void {

        let id = context.request.query.id;
        if (id == undefined) {
            context.response.status(404).send("invalid id");
            return;
        }

        let container = this.dockerAPI.getContainer(id);


        container.logs({
            timestamps: true,
            stdout: true,
            stderr: true,
            tty: false
        }, (err, stream) => {
            var data = "";

            var logStream = new Stream.PassThrough();
            logStream.on("data", chunk => {
                data += chunk;
            });

            stream.on("end", () => {
                stream.destroy();
                let parts = Parser(data);

                let html = "";
                for (let p of parts) {
                    html += p.text;
                }
                context.response.send("<pre>" + html + "</pre>");
            });

            this.dockerAPI.modem.demuxStream(stream, logStream, logStream);
        });
    }
}