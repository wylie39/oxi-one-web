import { Input, MessageEvent, Output, WebMidi } from "webmidi";
import { OXI_SYSEX_CAT, OXI_SYSEX_PROJECT, OXI_SYSEX_SYSTEM } from "./OXI_SYSEX_MSG";
import { deNibblize } from "./nibble";
import _ from "lodash";
import { saveAs } from 'file-saver';
import JSzip from 'jszip'


export class midiWorker {
    private state_: WorkerState_e = WorkerState_e.WORKER_IDLE
    deviceName = "OXI ONE Port 1"
    private SYSEX_HEADER = [0xf0,0x00,0x21,0x5b,0x00,0x01]
    private midiOutput: Output
    private midiInput: Input
    private webMidi: any
    public fwVersion: string
    private midiPromiseResolve: (value: unknown) => void
    private midiPromise: Promise<number[]>
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
            this.state_ = WorkerState_e.WORKER_IDLE
        } catch (error) {
            this.close()
            throw error
        }
    }

    public async close() {
        console.log("Closing MIDI");
        this.webMidi.disable()
        this.state_ = WorkerState_e.WORKER_DISCONECTED
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

    public async saveProject(project_index:number) {
      const zip = new JSzip();
      const projectFolder = zip.folder("Project " + project_index);
      projectFolder.file('Project ' + project_index + '.oxipro', await this.getProjectHeader(project_index)) //get ProjectHeader


      // 64 patterns in total
      for (let  pattern_index = 0;  pattern_index < 64;  pattern_index++) {
        projectFolder.file('Pattern ' + (pattern_index + 1) + '.oxipat', await this.GetPattern(pattern_index, project_index))
      }

      zip.generateAsync({type:"blob"}).then(function(content) {
        saveAs(content, "Project " + project_index + ".zip");
      });
    }

    private async getProjectHeader(index:number) {
      let data: number[] = []
      data = data.concat(this.SYSEX_HEADER)
      data.push(OXI_SYSEX_CAT.MSG_CAT_PROJECT)
      data.push(OXI_SYSEX_PROJECT.MSG_PROJECT_GET_PROJ_HEADER)
      data.push(index - 1)
      data.push(0)
      data.push(0xF7)

      this.midiPromise = new Promise((resolve, reject) => {
          this.midiPromiseResolve = resolve
      })
      this.midiOutput.send(data)
      return this.ProcessProjectHeader(await this.midiPromise)
    }

    private async GetPattern(pattern_idx:number, project_index:number) {
      let data: number[] = []
      data = data.concat(this.SYSEX_HEADER)
      data.push(OXI_SYSEX_CAT.MSG_CAT_PROJECT)
      data.push(OXI_SYSEX_PROJECT.MSG_PROJECT_GET_PATTERN)
      data.push(project_index - 1)
      data.push(0 * 16 + pattern_idx)
      data.push(0xF7)

      this.midiPromise = new Promise((resolve, reject) => {
          this.midiPromiseResolve = resolve
      })
      this.midiOutput.send(data)
      return this.ProcessPattern(await this.midiPromise)
    }

    private ProcessProjectHeader(data:number[]){
      let buffer = []
      deNibblize(buffer,data,10)
      let ia = new Uint8Array(buffer)
      const file = new Blob([ia],{
        type: "application/octet-stream"
      })
      return file
    }

    private ProcessPattern(data:number[]){
      let buffer = []
      deNibblize(buffer,data,10)
      let ia = new Uint8Array(buffer)
      const file = new Blob([ia],{
        type: "application/octet-stream"
      })
      return file
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
                                this.midiPromiseResolve(event.rawData)
                                break;

                            default:
                                break;
                        }
                        break;
                    case OXI_SYSEX_CAT.MSG_CAT_PROJECT:
                        switch (event.rawData[7]) {
                            case OXI_SYSEX_PROJECT.MSG_PROJECT_SEND_PROJ_HEADER:
                                this.midiPromiseResolve(event.rawData)
                                break;
                            case OXI_SYSEX_PROJECT.MSG_PROJECT_SEND_PATTERN:
                                this.midiPromiseResolve(event.rawData)
                                break;
                            default:
                                break;
                        }
                        break
                    default:
                        //console.log(event.message);
                        break;
                }
            }
        }
    }
}




export enum WorkerState_e {
    WORKER_DISCONECTED,
    WORKER_IDLE,
    WORKER_CANCELLING,
    WORKER_FW_UPDATE_OXI_ONE,
    WORKER_FW_UPDATE_BLE,
    WORKER_FW_UPDATE_SPLIT,
    WORKER_GET_PROJECT,
    WORKER_SEND_PROJECT,
    WORKER_GET_ALL_PROJECTS,
};
