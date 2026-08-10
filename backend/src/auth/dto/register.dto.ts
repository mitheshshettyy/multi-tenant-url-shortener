import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  tenantName: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'tenantSlug must only contain lowercase letters, numbers, and hyphens',
  })
  tenantSlug: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
