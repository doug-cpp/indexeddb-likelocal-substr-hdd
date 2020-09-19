import { Component } from '@angular/core';
import { IdbService } from './idb.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import './latinise';

interface Client {
  key: string;
  name: string;
  age: number;
  email: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'rawidb';

  clients: Promise<{}[]>;
  clientSearchResult: {id: number, name: string, email: string}[];
  currentClient = { key: '', name: '', age: 0, email: ''};
  likesearch = '';

  constructor(private idbs: IdbService, private http: HttpClient) {

    // Colocar esse sync interno às operações?
    // As operações sequentes já estão funcionando sem invocar o sync!
    this.idbs.syncDb().then(
      _ => {
        this.reset();
    });

  }
   public getJSON(): Observable<any> {
     return this.http.get('./assets/file01.json');
   }

  // ---------------------------------------------------------------------------
   public addFromJson(): void {
     
    this.getJSON().pipe(take(1)).subscribe(
      data => this.idbs.create(data, 'jsonbig').then(r => console.log(r), e => console.error(e))
    );
      // data.forEach(element => {
      //   // console.log(element);
      //   this.idbs.create(element, 'jsonbig').then(o => console.log(element.id), e=> console.error(e))
      // })
    // );
   }

   // ---------------------------------------------------------------------------

   searchFromSubstrOpenCursor(): void {
     this.clientSearchResult = [];

     // Tipar isso!
    const options = [{type: 'like', field: 'name', value: this.likesearch}];
    console.log('start searching');
    const t1 = performance.now();

    this.idbs.readList('jsonbig', options).then((l: {id: number, name: string, email: string}[]) => {
      this.clientSearchResult = l;
      if(this.clientSearchResult.length > 2) {
        console.log(this.clientSearchResult[0]);
        console.log(this.clientSearchResult[1]);
        console.log(this.clientSearchResult[2]);
      }
      console.log(`Encontrados ${this.clientSearchResult.length} registro(s).`);
      console.log(`Operação demorou ${(performance.now() - t1) / 1000} segundos.`);
    }, err => console.error(err));
   }

   // ---------------------------------------------------------------------------
   searchFromSubstrGetAll(): void {
     this.clientSearchResult = [];

    console.log('start searching');
    const t1 = performance.now();

    this.idbs.readList('jsonbig').then((list: {id: number, name: string, email: string}[]) => {
      list.forEach(el => {
        if(el.name.toLowerCase().latinise().includes(this.likesearch.toLowerCase().latinise())) {
            this.clientSearchResult.push(el);
          }
        });
        if(this.clientSearchResult.length > 2) {
          console.log(this.clientSearchResult[0]);
          console.log(this.clientSearchResult[1]);
          console.log(this.clientSearchResult[2]);
        }
        console.log(`Encontrados ${this.clientSearchResult.length} registro(s).`);
        console.log(`Operação demorou ${(performance.now() - t1) / 1000} segundos.`);
      });
    }

   // ---------------------------------------------------------------------------
   
  searchByName(): void {
    this.clients = this.idbs.searchList('clients', 'name', this.likesearch);
  }

  // ---------------------------------------------------------------------------
  
  reset(): void {
    this.clients = this.idbs.readList('clients');
  }
  
  // ---------------------------------------------------------------------------

  openAdd(): void {
    this.currentClient.key = '';
    this.currentClient.name = '';
    this.currentClient.age = 0;
    this.currentClient.email = '';
  }

  add(): void {
    if(this.currentClient.key === ''
    && this.currentClient.name.length > 5
    && this.currentClient.email.length > 5) {
      this.currentClient.key = 'id0' + (Math.floor(Math.random() * (100) + 14)).toString();
      this.idbs.create(this.currentClient, 'clients').then(_ => {
        this.clients = this.idbs.readList('clients');
        this.openAdd(); // Limpa o form.
        document.getElementById('formdiv').hidden = true;
      },
      err => alert(err));
    }
    else if(this.currentClient.key.length > 4
    && this.currentClient.name.length > 5
    && this.currentClient.email.length > 5){
      this.idbs.update(this.currentClient, 'clients', this.currentClient.key).then(_ => {
        this.clients = this.idbs.readList('clients');
        this.openAdd(); // Limpa o form.
        document.getElementById('formdiv').hidden = true;
      },
      err => alert(err));
    }
    else {
      alert('Dados inválidos no form');
    }
  }

  edit(key: string): void {
    this.idbs.readObject('clients', key).then((obj: Client) => {
      this.currentClient.key = obj.key;
      this.currentClient.name = obj.name;
      this.currentClient.age = obj.age;
      this.currentClient.email = obj.email;
    });
  }

  delete(key: string): void {
    this.idbs.delete('clients', key);
    this.clients = this.idbs.readList('clients');
    document.getElementById('formdiv').hidden = true;
  }
}
