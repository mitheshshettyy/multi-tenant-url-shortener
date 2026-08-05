import { IsBoolean, IsISO8601, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 200;

export class UpdateUrlDto {
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(MAX_URL_LENGTH)
  originalUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_TITLE_LENGTH)
  title?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * Optional and nullable: omitting this field leaves expiresAt untouched;
   * sending `null` explicitly clears an existing expiration. class-validator's
   * @IsOptional() treats both undefined and null as "skip further checks",
   * so a real ISO string is still validated when one is provided.
   */
  @IsOptional()
  @IsISO8601()
  expiresAt?: string | null;
}
