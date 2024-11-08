import { Input, MessageEvent, Output, WebMidi } from "webmidi";
import { OXI_SYSEX_CAT, OXI_SYSEX_PROJECT, OXI_SYSEX_SYSTEM } from "./OXI_SYSEX_MSG";
import { deNibblize } from "./nibble";
import _ from "lodash";

export class midiWorker {
    private state_: WorkerState_e = WorkerState_e.WORKER_IDLE
    deviceName = "OXI ONE Port 1"
    private SYSEX_HEADER = [0xf0,0x00,0x21,0x5b,0x00,0x01]
    private midiOutput: Output
    private midiInput: Input
    private webMidi: any
    public fwVersion: string
    private midiPromiseResolve: (value: unknown) => void
    private midiPromise: Promise<unknown>
    constructor() {}

    public async init() {
        try {
            console.log('Trying to start MIDI worker');
            this.webMidi = await WebMidi.enable({sysex: true})
            this.findOxi()
            this.midiInput.addListener("midimessage",this.onMidiReceive.bind(this))
            console.log("MIDI worker started");
            this.GetFwVersion()
            await this.midiPromise
        } catch (error) {
            console.log("Error: ", error);
        }
    }


    private findOxi() {
      const inputs = this.webMidi.inputs.filter((x) => x.name.includes("ONE"))
      const outputs = this.webMidi.outputs.filter((x) => x.name.includes("ONE"))
      if (inputs.length && outputs.length) {
        console.log("Found OXI One");
        this.midiOutput = WebMidi.getOutputById(outputs[0].id)
        this.midiInput = WebMidi.getInputById(inputs[0].id);
      } else{
        throw "OXI One not found"
      }
    }


    private GetFwVersion() {
        this.sendCmd(OXI_SYSEX_CAT.MSG_CAT_SYSTEM,OXI_SYSEX_SYSTEM.MSG_SYSTEM_SW_VERSION)
    }

    public getState(){
        return this.state_
    }

    public async getProject(index:number) {
        let data: number[] = []
        data = data.concat(this.SYSEX_HEADER)
        data.push(OXI_SYSEX_CAT.MSG_CAT_PROJECT)
        data.push(OXI_SYSEX_PROJECT.MSG_PROJECT_GET_PROJ_HEADER)
        data.push(index)
        data.push(0)
        data.push(0xF7)

        this.midiPromise = new Promise((resolve, reject) => {
            this.midiPromiseResolve = resolve
        })
        this.midiOutput.send(data)
        await this.midiPromise
    }


    public setState(state:WorkerState_e){
        this.state_ = state
    }

    private sendCmd(cat:OXI_SYSEX_CAT,id:number){
        let data: number[] = []
        data = data.concat(this.SYSEX_HEADER)
        data.push(cat)
        data.push(id)
        data.push(0xF7)

        this.midiPromise = new Promise((resolve, reject) => {
            this.midiPromiseResolve = resolve
        })
        this.midiOutput.send(data)
    }

    private onMidiReceive(event: MessageEvent){
        if (event.message.type === 'sysex') {
            if (_.isEqual(event.rawData.slice(0,6),this.SYSEX_HEADER)) {
                switch (event.rawData[6]) {
                    case OXI_SYSEX_CAT.MSG_CAT_SYSTEM:
                        switch (event.rawData[7]) {
                            case OXI_SYSEX_SYSTEM.MSG_SYSTEM_SW_VERSION:
                                let version = '';
                                let buffer = []
                                deNibblize(buffer,event.rawData as unknown as number[],8)
                                for (let varIndex = 0; varIndex < buffer.length; ++varIndex) {
                                    const c = String.fromCharCode(buffer[varIndex]);
                                    if (c === ' ' || c === '\0') {
                                        version += '\0';
                                        break;
                                    } else {
                                        version += c;
                                    }
                                }
                                this.fwVersion = version
                                break;

                            default:
                                break;
                        }
                        break;
                    case OXI_SYSEX_CAT.MSG_CAT_PROJECT:
                        switch (event.rawData[7]) {
                            case OXI_SYSEX_PROJECT.MSG_PROJECT_SEND_PROJ_HEADER:
                                console.log(event.rawData);
                                break;
                            default:
                                console.log(event.rawData);
                                break;
                        }
                        break
                    default:
                        //console.log(event.message);
                        break;
                }
            }
        }
        this.midiPromiseResolve(true)
    }
}




enum WorkerState_e {
    WORKER_IDLE,
    WORKER_CANCELLING,
    // launch thread
    WORKER_FW_UPDATE_OXI_ONE,
    WORKER_FW_UPDATE_BLE,
    WORKER_FW_UPDATE_SPLIT,
    WORKER_GET_PROJECT,
    WORKER_SEND_PROJECT,
    WORKER_GET_ALL_PROJECTS,
};
