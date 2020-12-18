import { HttpClient, HttpParams } from '@angular/common/http'
import { Inject, Injectable } from '@angular/core'

@Injectable()
export class BackendService {

    username = ''
    password = ''

    constructor(private http: HttpClient) { }

    async login(username: string, password: string): Promise<any> {
        this.username = username
        this.password = password
        const loginDetails = {username: username, password: password}
        console.log(loginDetails)
        const loginResult = await this.http.post<any>('/login', loginDetails).toPromise()
        .then(result => {return result})
        return loginResult
    }

    getLoginCredentials() {
        const username = this.username
        const password = this.password
        return [username, password]
    }
    async shareContent(data: FormData): Promise<any> {
        await this.http.post<any>('/share', data).toPromise()
        .then(result => {
            console.log(result)
        })
        return
    }
}

