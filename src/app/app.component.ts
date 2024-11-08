import { Component, OnInit } from '@angular/core';
import { midiWorker } from 'oxiOneTsLib/src';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'oxiOneWeb';

  ngOnInit(): void {
      const worker = new midiWorker()
      worker.init().then(()=>{
          console.log(worker.fwVersion);
          //worker.getProject(0)
      })

  }
}

