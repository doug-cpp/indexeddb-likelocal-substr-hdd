// import { Injectable } from '@angular/core';

// @Injectable()
// export class IdbService {

//   constructor() { }
// interface IDBObjectStore {
//   getAll(): IDBRequest;
// }
// }
/////////////////////
import { Injectable } from '@angular/core';

interface TableConfig {
  name: string;
  key: string;
  indexes: {
    name: string,
    unique: boolean
  }[];
}

@Injectable()
export class IdbService {

  private readonly dbname = 'TEST_JSONBIG2';
  private readonly dbversion = 1;
  private readonly tables: TableConfig[] = [
    {
      name: 'jsonbig',
      key: 'key',
      indexes: [
        {
          name: 'name',
          unique: false
        },
        {
          name: 'email',
          unique: false
        }
      ]
    },
    {
      name: 'clients',
      key: 'key',
      indexes: [
        {
          name: 'name',
          unique: false
        },
        {
          name: 'email',
          unique: true
        },
        {
          name: 'cpfcnpj',
          unique: true
        },
        {
          name: 'date',
          unique: false
        },
        {
          name: 'age',
          unique: false
        }
      ]
    },
    {
      name: 'products',
      key: 'key',
      indexes: [
        {
          name: 'name',
          unique: false
        },
        {
          name: 'price',
          unique: false
        },
        {
          name: 'category',
          unique: false
        },
        {
          name: 'date',
          unique: false
        }
      ]
    }
  ];
  private idbOpenRequest: IDBOpenDBRequest;
  private db: IDBDatabase;

  constructor() { }

  private configTables(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let countCompleteTables = 0;
      this.tables.forEach(table => {
        console.log('Nome e chave: ', table.name, table.key);
        console.log('Índices: ', table.indexes);
        // Cria um objectStore para conter a informação sobre nossos clientes. Nós vamos
        // usar "ssn" como key path porque sabemos que é único;
        const objectStore = this.db.createObjectStore(table.name, { keyPath: table.key, autoIncrement: true });
        // const objectStore = this.db.createObjectStore(table.name, { keyPath: table.key });

        table.indexes.forEach(index => {
          objectStore.createIndex(index.name, index.name, { unique: index.unique });

          // Usando transação oncomplete para afirmar que a criação do objectStore 
          // é terminada antes de adicionar algum dado nele.
          objectStore.transaction.oncomplete = _ => {
            // Incrementa a quantidade de tabelas que terminaram de serem criadas:
            countCompleteTables++;

            // Se essa quantidade for a mesma do total de tabelas, então é porque
            // todas já foram criadas:
            if (this.tables.length === countCompleteTables) {
              resolve(true);
            }
          };
          // Quando ocorre algum erro ao criar alguma tabela, rejeita a operação:
          objectStore.transaction.onerror = evt => reject(objectStore.transaction.error);
        });
      });
    });
  }

  syncDb(): Promise<string> {

    return new Promise((resolve, reject) => {
      this.idbOpenRequest = indexedDB.open(this.dbname, this.dbversion);

      // Ao criar/atualizar com sucesso:
      this.idbOpenRequest.onsuccess = event => {
        this.db = this.idbOpenRequest.result;
        this.db.onversionchange = evt => resolve('version changed');
        this.db.onerror = evt => console.error(evt.target);
        resolve('success open request');
      };

      // Ao ser atualizado:
      this.idbOpenRequest.onupgradeneeded = event => {
        this.db = this.idbOpenRequest.result;

        console.log('upgrade needed');
        this.configTables().then(_ => resolve('tables created'));

        this.db.onerror = evt => console.error(evt.target);
      };

      // Erro ao criar/atualizar:
      this.idbOpenRequest.onerror = evt => reject('Problemas ao criar/atualizar: ' + evt.target);
    });
  }

  count(table: string): Promise<number> {
    return new Promise((resolve, reject) => {

      // create transaction from database
      const transaction = this.db.transaction(table, 'readonly');

      // get store from transaction
      // returns IDBObjectStore instance
      const store = transaction.objectStore(table);

      // count number of objects in store
      const count = store.count();

      count.onsuccess = evt => resolve(count.result);
      count.onerror = evt => reject(count.error);
    });
  }

    create(jsonData, table: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // console.log('erro?');
      // Armazenando valores no novo objectStore.
      const transaction = this.db.transaction(table, 'readwrite');
      const store = transaction.objectStore(table);

      if( Array.isArray(jsonData) && jsonData.length > 0 ) {
        console.log('É um array! Inserindo... aguarde!');
        jsonData.forEach(el => store.add(el));
        transaction.oncomplete = evt => resolve('All records inserted!');
        transaction.onerror = evt => resolve(transaction.error.toString());
      } else {
        console.log('Não é um array! Inserindo apenas um');
        const obj = store.add(jsonData);
        obj.onsuccess = evt => resolve(obj.toString());
        obj.onerror = evt => reject(obj.error);
      }
    });
  }

  readObject(table: string, key: string): Promise<{} | 'not found'> {
    return new Promise(async (resolve, reject) => {
      const db = this.idbOpenRequest.result;
      const transaction = db.transaction(table, 'readonly');
      const store = transaction.objectStore(table);
      const request = store.get(key);
      request.onsuccess = evt => resolve(request.result ? request.result : 'not found');
      request.onerror = evt => reject(request.error);
    });
  }

  readList(table: string, options?: any,
    sortOptions?: { key: string, type: 'asc' | 'desc' }): Promise<{}[]> {
    return new Promise((resolve, reject) => {

      const transaction = this.db.transaction(table, 'readonly');
      const store = transaction.objectStore(table);
      const list = store.getAll();
      // const list = store.getAll();
      list.onsuccess = evt => resolve(list.result);
      list.onerror = evt => reject(`Table ${table} exists? ${list.error}`);
    });
  }

  // ----------------------------------------------------------------------

  searchList(table: string, field: string, like: string): Promise<{}[]> {
    return new Promise((resolve, reject) => {

      const result = [];
      const list = this.db.transaction(table, 'readonly')
        .objectStore(table).index(field)
        .openCursor(
          IDBKeyRange.bound(like, like + '\uffff'),
          'prev');

      list.onsuccess = evt => {
        const cursor = list.result;
        if (cursor) {
          result.push(cursor.value);
          cursor.continue();
        } else if (result.length) {
          result.sort((a, b) => a[field][1] - b[field][2]);
        }
        resolve(result);
      };
      list.onerror = evt => reject(list.error);
    });
  }

  // ----------------------------------------------------------------------

  update(jsonData, table: string, key: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(table, 'readwrite');

      const store = transaction.objectStore(table);
      const getRequest = store.get(key);

      // this.db.setDefaultErrorHandler(getRequest);

      getRequest.onsuccess = e => {

        const foundRecord = getRequest.result;

        if (foundRecord !== undefined) {

          const putRequest = store.put(jsonData);

          // this.db.setDefaultErrorHandler(putRequest);

          putRequest.onsuccess = evt => resolve(true);
          putRequest.onerror = evt => reject(putRequest.error);

        } else {
          reject(`Não existe o registro ${key} na tabela ${table}.`);
        }
      };
    });
  }

  delete(table: string, key: string, moveToDeletedItems?: boolean): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(table, 'readwrite');

      const store = transaction.objectStore(table);
      const deleteRequest = store.delete(key);

      // db.setDefaultErrorHandler(deleteRequest);

      // FUNCIONANDO, PORÉM NÃO DÁ PRA SABER SE REALMENTE APAGOU OU SE NÃO ACHOU:
      deleteRequest.onsuccess = evt => resolve(true);
      deleteRequest.onerror = evt => reject(deleteRequest.error);
    });
  }
}
