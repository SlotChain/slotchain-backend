import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AvailabilityModule } from './availability/availability.module';
import { MeetingsModule } from './meetings/meetings.module';
import mongoose, { ConnectOptions } from 'mongoose';

let isConnected = false;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MongooseModule.forRootAsync({
      useFactory: async () => {
        const uri = process.env.MONGO_URI;

        if (!uri) {
          throw new Error(
            '❌ MONGO_URI is not defined in environment variables.',
          );
        }

        const options: ConnectOptions = {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 10000,
          bufferCommands: false,
        };

        if (isConnected) {
          console.log('⚡ Reusing existing MongoDB connection');
          return { uri, ...options };
        }

        try {
          console.log('🔗 Connecting to MongoDB...');
          const conn = await mongoose.connect(uri, options);
          isConnected = conn.connections[0].readyState === 1;
          console.log('✅ MongoDB connected successfully');
        } catch (err) {
          console.error(
            '❌ MongoDB connection error:',
            err instanceof Error ? err.message : err,
          );
          throw err;
        }

        return { uri, ...options };
      },
    }),

    AuthModule,
    AvailabilityModule,
    MeetingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
