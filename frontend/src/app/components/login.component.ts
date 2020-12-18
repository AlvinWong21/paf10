import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavigationExtras, Router } from '@angular/router';
import { BackendService } from '../backend.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

	errorMessage = ''
  loginForm: FormGroup

	constructor(
    private fb: FormBuilder,
    private router: Router,
    private bckSvc: BackendService
  ) { }

	ngOnInit(): void { 
    this.loginForm = this.fb.group({
      username: this.fb.control('', Validators.required),
      password: this.fb.control('', Validators.required)
    })
  }

  async login() {
    let username = this.loginForm.get('username').value.trim()
    let password = this.loginForm.get('password').value

    try {
      const loginResult = await this.bckSvc.login(username, password)
      console.log(loginResult)

      let loginCredentials: NavigationExtras ={
        queryParams: {
          username: username,
          password: password
        },
        skipLocationChange: false,
        fragment: 'top'
      }
      this.router.navigate(['/main'])
      

    }catch(e) {
      this.errorMessage = 'Login Failed.'
    }
    
  }
}
