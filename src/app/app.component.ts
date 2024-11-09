import { Component, OnInit, Injectable } from '@angular/core';
import { midiWorker, WorkerState_e } from 'oxiOneTsLib/src';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'oxiOneWeb';
  fwVersion = '';
  isConnected = false;
  error = '';
  worker: midiWorker;
  file: FileList;
  selectedProject = 1; // Default project
  projects = Array.from({ length: 15 }, (_, i) => i + 1); // Generates an array [1, 2, ..., 15]

  ngOnInit(): void {}

  isMidiSupported(): boolean {
    return typeof navigator.requestMIDIAccess === 'function';
  }

  connect() {
    this.worker = new midiWorker();
    this.worker
      .init()
      .then(() => {
        if (this.worker.getState() === WorkerState_e.WORKER_IDLE) {
          this.fwVersion = this.worker.fwVersion;
          this.isConnected = true;
          this.error = '';
        }
      })
      .catch(e => {
        this.error = e;
      });
  }

  getProject() {
    this.worker.saveProject(this.selectedProject).catch(e => {
      this.error = e;
    });
  }

  getProjects() {
    this.worker.listProjects();
  }

  onUpload(event) {
    this.file = event.target.files;
  }

  sendProject() {
    this.worker.sendProject(this.selectedProject, this.file[0]).catch(e => {
      this.error = e;
    });
  }

  disconnect() {
    this.worker.close().then(() => {
      if (this.worker.getState() === WorkerState_e.WORKER_DISCONECTED) {
        this.fwVersion = '';
        this.isConnected = false;
      }
    });
  }
}
