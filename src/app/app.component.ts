import { Component, OnInit, Injectable } from '@angular/core';
import { midiWorker, WorkerState_e } from 'oxiOneTsLib/src';
import { NgxSpinnerService } from 'ngx-spinner';

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
  fileName = '';
  selectedProject = 1; // Default project
  projects = [];

  constructor(private spinner: NgxSpinnerService) {}

  ngOnInit(): void {}

  isMidiSupported(): boolean {
    return typeof navigator.requestMIDIAccess === 'function';
  }

  connect() {
    this.spinner.show();
    this.worker = new midiWorker();
    this.worker
      .init()
      .then(() => {
        if (this.worker.getState() === WorkerState_e.WORKER_IDLE) {
          this.fwVersion = this.worker.fwVersion;
          this.projects = this.worker.projects;
          this.isConnected = true;
          this.error = '';
          this.spinner.hide();
        }
      })
      .catch(e => {
        this.error = e;
        this.spinner.hide();
      });
  }

  getProject() {
    this.spinner.show();
    this.worker
      .saveProject(this.selectedProject)
      .then(() => {
        this.spinner.hide();
      })
      .catch(e => {
        this.error = e;
      });
  }

  deleteProject() {
    this.worker
      .deleteProject(this.selectedProject)
      .then(() => {
        this.projects = this.worker.projects;
        console.log(this.projects);
      })
      .catch(e => {
        this.error = e;
      });
  }

  getProjects() {
    this.worker.listProjects().then(() => {
      this.projects = this.worker.projects;
      console.log(this.projects);
    });
  }

  onUpload(event) {
    this.file = event.target.files;
    this.worker.getProjectName(this.file[0]).then(name => {
      this.fileName = name;
    });
  }

  sendProject() {
    this.spinner.show();
    this.worker
      .sendProject(this.selectedProject, this.file[0])
      .then(() => {
        this.projects = this.worker.projects;
        this.spinner.hide();
      })
      .catch(e => {
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
