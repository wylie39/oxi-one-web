import { Component, OnInit } from '@angular/core';
import { midiWorker, WorkerState_e } from 'oxiOneTsLib/src';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'oxiOneWeb';
  fwVersion = ""
  isConected = false
  error = ""
  worker: midiWorker

  ngOnInit(): void {
      
  }

  connect() {
      this.worker = new midiWorker()
      this.worker.init().then(()=>{        
          if (this.worker.getState() === WorkerState_e.WORKER_IDLE) {        
            this.fwVersion = this.worker.fwVersion
            this.isConected = true
            this.error = ""
          }
      }).catch((e) => {
        this.error = e
      })
  }

  getProject(){
    this.worker.getProject(0)
  }

  disconect() {
    this.worker.close().then(() => {            
      if (this.worker.getState() === WorkerState_e.WORKER_DISCONECTED) {                
        this.fwVersion = ""
        this.isConected = false
      }
    })
  }
}

