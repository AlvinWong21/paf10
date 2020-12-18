import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BackendService } from '../backend.service';
import {CameraService} from '../camera.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

	username = ''
	password = ''
	imagePath = '/assets/cactus.png'
	imageFile
	imgFilled = false
	shareButton = false //true
	mainForm: FormGroup

	constructor(
		private fb: FormBuilder,
		private router: Router,
		private bckSvc: BackendService,
		private cameraSvc: CameraService
		) { }

	ngOnInit(): void {
			this.mainForm = this.fb.group({
			title: this.fb.control('', Validators.required),
			comments: this.fb.control('', Validators.required),
			image: this.fb.control('', Validators.required)
		})

	  	if (this.cameraSvc.hasImage()) {
		  	const img = this.cameraSvc.getImage()
			  this.imagePath = img.imageAsDataUrl
			  this.imageFile = img.imageData
			  this.mainForm.patchValue({"image": "1"})
		}		
	}

	clear() {
		this.imagePath = '/assets/cactus.png'
		this.mainForm.patchValue({"image": ""})
	}

	async submit() {
		const value = this.mainForm.value
		const loginCredentials = this.bckSvc.getLoginCredentials()
		const formData = new FormData()
		formData.set('username', loginCredentials[0])
		formData.set('password', loginCredentials[1])
		formData.set('title', value.title)
		formData.set('comments', value.comments)
		formData.set('imageFile', this.imageFile)
		console.log("Username: ", formData.get('username'))
		console.log("Password: ", formData.get('password'))
		console.log("Title: ", formData.get('title'))
		console.log("Comments: ", formData.get('comments'))
		console.log("imageFile: ", formData.get('imageFile'))

		try {
			const shareResult = await this.bckSvc.shareContent(formData)
			this.mainForm.reset()
			this.imagePath = '/assets/cactus.png'
		}catch(e) {
			console.log(e)
		}
	
	}
}
