import { Router } from 'express';

const router = Router();

router.post('/', (req, res) => {
    const { fromAccount, toAccount, amount, description } = req.body;

    const timestamp = new Date().toLocaleString('fr-FR');

    console.log("\n======================================");
    console.log('NOTIFICATION SERVICE (port 3002');
    console.log("===================================");
    console.log(`Date     : ${timestamp}`);
    console.log(`De       : Compte : #${fromAccount.id} (${fromAccount.label})`);
    console.log(`Vers       : Compte : #${toAccount.id} (${toAccount.label})`);
    console.log(`Montant  : ${amount} €`);
    console.log(`Desc.    : ${description || 'Aucune'}`);
    console.log("\n=======================================");

    res.status(200).json({
        success: true,
        message: "Notification envoyée avec succès",
        timestamp
    });
});

export default router;