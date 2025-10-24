import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/')
  health() {
    return { ok: true, message: 'SlotChain backend running ✅' };
  }

  @Get('/health')
  getHealth() {
    return { ok: true, message: 'SlotChain API health OK 🚀' };
  }

  @Get('/hello')
  getHello(): string {
    return this.appService.getHello();
  }
}
