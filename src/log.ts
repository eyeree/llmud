import { default as Logger } from 'bunyan';

function getYYYYMMDDHHMMSS() {

    function pad2(n:number) {
        return (n < 10 ? '0' : '') + n;
    }

    const now = new Date();

    return now.getFullYear() +
        pad2(now.getMonth() + 1) + 
        pad2(now.getDate()) +
        pad2(now.getHours()) +
        pad2(now.getMinutes()) +
        pad2(now.getSeconds());

}

export class Log {

    static create() {

        const name = getYYYYMMDDHHMMSS();

        const log = Logger.createLogger({
            name: name,
            streams: [{
                path: `./log/${name}.log`,
            }]
        });

        return new Log(log);

    }

    private constructor(private readonly log:Logger) {
    }

    info(obj: Object, ...params: any[]) {
        this.log.info(obj, ...params);
    }

    debug(obj: Object, ...params: any[]) {
        this.log.debug(obj, ...params);
    }

    error(obj: Object, ...params: any[]) {
        this.log.error(obj, ...params);
    }

    child(obj: Object) {
        return new Log(this.log.child(obj));
    }

}

export const log = Log.create();