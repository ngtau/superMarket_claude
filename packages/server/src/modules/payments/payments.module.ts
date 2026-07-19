import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsAdminController, PaymentMethodsController } from "./payments.admin.controller.js";
import { PaymentsService } from "./payments.service.js";
import { PaymentsAdminService } from "./payments.admin.service.js";
import { PaymentsWebhookService } from "./payments.webhook.service.js";
import { BankTransferProvider } from "../payment/bank-transfer.provider.js";

@Module({
  controllers: [PaymentsController, PaymentsAdminController, PaymentMethodsController],
  providers: [PaymentsService, PaymentsAdminService, PaymentsWebhookService, BankTransferProvider],
})
export class PaymentsModule {}
