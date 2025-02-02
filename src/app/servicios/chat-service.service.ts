import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import SockJS from 'sockjs-client';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})

export class ChatServiceService {
  private stompClient!: Client;
  private messageSubject = new Subject<any>();
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  private API_URL = 'http://localhost:8090/api/mensajes';
  private IMAGE_UPLOAD_URL= 'http://localhost:8090/api/imagenes/subir';
  
  constructor(private http: HttpClient) {}

  conectar() {
    if (this.isConnectedSubject.value) {
      console.log('Ya estás conectado');
      return;
    }
    const socket = new SockJS('http://localhost:8090/chat-websocket');
    this.stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log(str), // Para depuración
      reconnectDelay: 5000, // Intentos de reconexión cada 5 segundos
    });

    this.stompClient.onConnect = (frame) => {
      console.log('Conectado:', frame);
      console.log('Frames de conexión:', frame.headers);
      this.isConnectedSubject.next(true);

      this.stompClient.subscribe('/chat/mensaje', (message: IMessage) => {
        this.messageSubject.next(JSON.parse(message.body));
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Error STOMP:', frame.headers['message']);
    };

    this.stompClient.activate();
  }

  desconectar() {
    if (this.stompClient && this.isConnectedSubject.value) {
      this.stompClient.deactivate();
      this.isConnectedSubject.next(false);
      console.log('Desconectado del servidor');
    } else {
      console.log('No estás conectado');
    }
  }

  sendMessage(mensaje: any) {
    if (this.isConnectedSubject.value) {
      console.log('Enviando mensaje:', mensaje); // Log para verificar el mensaje
      this.stompClient.publish({
        destination: '/app/mensaje',
        body: JSON.stringify(mensaje),
      });
    } else {
      console.error('No se puede enviar el mensaje. No estás conectado.');
    }
  }

  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post('http://localhost:8090/api/imagenes/subir', formData, {
      responseType: 'text'  // Esto asegura que la respuesta sea interpretada como texto
    });
  }

  getMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  getMensajesGuardados(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL);
  }

  get conectado(): boolean {
    return this.isConnectedSubject.value;
  }

  getMensajesPorUsuario(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/usuario/${username}`);
  }
}