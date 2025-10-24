import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AvailabilityModule } from './availability/availability.module';
import { MeetingsModule } from './meetings/meetings.module';
import mongoose from 'mongoose';

// Maintain a single shared connection across cold starts
let isConnected = false;

@Module({
  imports: [
    // Global environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // MongoDB connection with caching and shorter timeouts
    MongooseModule.forRootAsync({
      useFactory: async () => {
        if (isConnected) {
          console.log('⚡ Reusing existing MongoDB connection');
          return { uri: process.env.MONGO_URI };
        }

        try {
          console.log('🔗 Connecting to MongoDB...');
          const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // stop trying after 5s
            connectTimeoutMS: 5000, // 5s connect timeout
            socketTimeoutMS: 10000, // close sockets after 10s idle
            bufferCommands: false, // disable buffering
          });
          isConnected = conn.connections[0].readyState === 1;
          console.log('✅ MongoDB connected successfully');
        } catch (err) {
          console.error('❌ MongoDB connection error:', err.message);
        }

        return { uri: process.env.MONGO_URI };
      },
    }),

    // Your app feature modules
    AuthModule,
    AvailabilityModule,
    MeetingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
