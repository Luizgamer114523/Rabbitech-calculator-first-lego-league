/* Rabbitech complete interface i18n. Exact UI phrases only; never translate user-entered data. */
(()=>{'use strict';
 if(window.__rbCompleteI18nLoaded)return;window.__rbCompleteI18nLoaded=true;
 const LANGS=[
  ['pt-BR','Português'],['en','English'],['es','Español'],['fr','Français'],
  ['de','Deutsch'],['it','Italiano'],['zh-CN','中文（简体）'],['ja','日本語'],['hi','हिन्दी']
 ];
 const CODES=LANGS.map(x=>x[0]);
 const R=[
 ["Placar","Scoreboard","Marcador","Tableau des scores","Spielstand","Tabellone","记分板","スコアボード","स्कोरबोर्ड"],
 ["Histórico","History","Historial","Historique","Verlauf","Cronologia","历史记录","履歴","इतिहास"],
 ["Ranking","Leaderboard","Clasificación","Classement","Rangliste","Classifica","排行榜","ランキング","लीडरबोर्ड"],
 ["Estratégia","Strategy","Estrategia","Stratégie","Strategie","Strategia","策略","戦略","रणनीति"],
 ["Rotas","Routes","Rutas","Itinéraires","Routen","Percorsi","路线","ルート","मार्ग"],
 ["Regras","Rules","Reglas","Règles","Regeln","Regole","规则","ルール","नियम"],
 ["Privacidade","Privacy","Privacidad","Confidentialité","Datenschutz","Privacy","隐私","プライバシー","गोपनीयता"],
 ["Admin","Admin","Administración","Administration","Administration","Amministrazione","管理","管理者","व्यवस्थापक"],
 ["Equipe","Team","Equipo","Équipe","Team","Squadra","团队","チーム","टीम"],
 ["Música","Music","Música","Musique","Musik","Musica","音乐","音楽","संगीत"],
 ["Rabbitech TV","Rabbitech TV","Rabbitech TV","Rabbitech TV","Rabbitech TV","Rabbitech TV","Rabbitech TV","Rabbitech TV","Rabbitech TV"],
 ["Início","Home","Inicio","Accueil","Startseite","Home","首页","ホーム","मुखपृष्ठ"],
 ["Atualizar","Refresh","Actualizar","Actualiser","Aktualisieren","Aggiorna","刷新","更新","रिफ़्रेश"],
 ["Salvar","Save","Guardar","Enregistrer","Speichern","Salva","保存","保存","सहेजें"],
 ["Cancelar","Cancel","Cancelar","Annuler","Abbrechen","Annulla","取消","キャンセル","रद्द करें"],
 ["Fechar","Close","Cerrar","Fermer","Schließen","Chiudi","关闭","閉じる","बंद करें"],
 ["Voltar","Back","Volver","Retour","Zurück","Indietro","返回","戻る","वापस"],
 ["Próximo","Next","Siguiente","Suivant","Weiter","Avanti","下一步","次へ","आगे"],
 ["Concluir","Finish","Finalizar","Terminer","Fertigstellen","Termina","完成","完了","समाप्त"],
 ["Confirmar","Confirm","Confirmar","Confirmer","Bestätigen","Conferma","确认","確認","पुष्टि करें"],
 ["Excluir","Delete","Eliminar","Supprimer","Löschen","Elimina","删除","削除","हटाएँ"],
 ["Editar","Edit","Editar","Modifier","Bearbeiten","Modifica","编辑","編集","संपादित करें"],
 ["Pesquisar","Search","Buscar","Rechercher","Suchen","Cerca","搜索","検索","खोजें"],
 ["Criar","Create","Crear","Créer","Erstellen","Crea","创建","作成","बनाएँ"],
 ["Entrar","Join","Unirse","Rejoindre","Beitreten","Unisciti","加入","参加","शामिल हों"],
 ["Entrar com Google","Sign in with Google","Iniciar sesión con Google","Se connecter avec Google","Mit Google anmelden","Accedi con Google","使用 Google 登录","Google でログイン","Google से साइन इन करें"],
 ["Trocar conta Google","Switch Google account","Cambiar cuenta de Google","Changer de compte Google","Google-Konto wechseln","Cambia account Google","切换 Google 账号","Google アカウントを切り替える","Google खाता बदलें"],
 ["Sair","Sign out","Cerrar sesión","Se déconnecter","Abmelden","Esci","退出登录","ログアウト","साइन आउट"],
 ["Iniciar","Start","Iniciar","Démarrer","Starten","Avvia","开始","開始","शुरू करें"],
 ["Pausar","Pause","Pausar","Mettre en pause","Pausieren","Pausa","暂停","一時停止","रोकें"],
 ["Resetar","Reset","Reiniciar","Réinitialiser","Zurücksetzen","Ripristina","重置","リセット","रीसेट"],
 ["Imprimir placar","Print scoreboard","Imprimir marcador","Imprimer le tableau","Spielstand drucken","Stampa tabellone","打印记分板","スコアボードを印刷","स्कोरबोर्ड प्रिंट करें"],
 ["PONTOS NESTE ROUND","SCORE THIS ROUND","PUNTOS DE ESTA RONDA","POINTS DE CETTE MANCHE","PUNKTE IN DIESER RUNDE","PUNTI DI QUESTO ROUND","本轮得分","このラウンドの得点","इस राउंड के अंक"],
 ["MISSÕES PONTUADAS","MISSIONS SCORED","MISIONES PUNTUADAS","MISSIONS MARQUÉES","BEWERTETE MISSIONEN","MISSIONI COMPLETATE","已计分任务","得点したミッション","अंक वाली मिशन"],
 ["CRONÔMETRO","TIMER","CRONÓMETRO","CHRONOMÈTRE","TIMER","CRONOMETRO","计时器","タイマー","टाइमर"],
 ["RODADAS GUARDADAS","SAVED ROUNDS","RONDAS GUARDADAS","MANCHES ENREGISTRÉES","GESPEICHERTE RUNDEN","ROUND SALVATI","已保存回合","保存済みラウンド","सहेजे गए राउंड"],
 ["TEMPO OFICIAL DO ROBOT GAME","OFFICIAL ROBOT GAME TIME","TIEMPO OFICIAL DEL JUEGO DEL ROBOT","DURÉE OFFICIELLE DU JEU DU ROBOT","OFFIZIELLE ROBOT-GAME-ZEIT","TEMPO UFFICIALE DEL ROBOT GAME","机器人比赛官方时间","ロボットゲーム公式時間","रोबोट गेम का आधिकारिक समय"],
 ["Pronto para iniciar.","Ready to start.","Listo para comenzar.","Prêt à démarrer.","Bereit zum Start.","Pronto per iniziare.","准备开始。","開始する準備ができました。","शुरू करने के लिए तैयार।"],
 ["Pausado / pronto","Paused / ready","En pausa / listo","En pause / prêt","Pausiert / bereit","In pausa / pronto","已暂停 / 就绪","一時停止中 / 準備完了","रुका हुआ / तैयार"],
 ["de um máximo de 510","out of a maximum of 510","de un máximo de 510","sur un maximum de 510","von maximal 510","su un massimo di 510","最高 510 分","最大 510 点中","अधिकतम 510 में से"],
 ["com pelo menos 1 ponto","with at least 1 point","con al menos 1 punto","avec au moins 1 point","mit mindestens 1 Punkt","con almeno 1 punto","至少 1 分","1 点以上","कम से कम 1 अंक"],
 ["neste dispositivo","on this device","en este dispositivo","sur cet appareil","auf diesem Gerät","su questo dispositivo","在此设备上","この端末","इस डिवाइस पर"],
 ["Missões M01–M15","Missions M01–M15","Misiones M01–M15","Missions M01–M15","Missionen M01–M15","Missioni M01–M15","任务 M01–M15","ミッション M01–M15","मिशन M01–M15"],
 ["Marque apenas o que foi confirmado no tapete. As restrições que retiram pontos ficam agrupadas no final da página.","Check only what was confirmed on the mat. Point deductions are grouped at the end of the page.","Marca solo lo que se confirmó en el tapete. Las restricciones que restan puntos están agrupadas al final de la página.","Cochez uniquement ce qui a été confirmé sur le tapis. Les restrictions qui retirent des points sont regroupées à la fin de la page.","Markiere nur, was auf der Matte bestätigt wurde. Punktabzüge sind am Ende der Seite zusammengefasst.","Segna solo ciò che è stato confermato sul tappeto. Le restrizioni che sottraggono punti sono raggruppate alla fine della pagina.","只勾选在任务垫上确认的项目。扣分限制集中在页面末尾。","マット上で確認できた項目だけにチェックしてください。減点条件はページの最後にまとめています。","मैट पर पुष्टि की गई चीज़ों को ही चुनें। अंक घटाने वाली पाबंदियाँ पेज के अंत में दी गई हैं।"],
 ["Natureza em equilíbrio.","Nature in balance.","Naturaleza en equilibrio.","La nature en équilibre.","Natur im Gleichgewicht.","Natura in equilibrio.","自然和谐共生。","自然との調和。","प्रकृति में संतुलन।"],
 ["Placar sob controle.","Scoring under control.","Puntuación bajo control.","Le score sous contrôle.","Punktestand unter Kontrolle.","Punteggio sotto controllo.","得分尽在掌控。","スコアをしっかり管理。","स्कोर नियंत्रण में।"],
 ["Placar de treino da BIOGLOW FLLC 2026–2027. Registre condições verificadas, pratique rounds de 2min30s e revise as regras e atualizações oficiais.","BIOGLOW FLLC 2026–2027 practice scoreboard. Record verified conditions, practice 2 min 30 sec rounds, and review official rules and updates.","Marcador de práctica BIOGLOW FLLC 2026–2027. Registra condiciones verificadas, practica rondas de 2 min 30 s y revisa las reglas y actualizaciones oficiales.","Tableau d’entraînement BIOGLOW FLLC 2026–2027. Enregistrez les conditions vérifiées, entraînez-vous sur des manches de 2 min 30 et consultez les règles et mises à jour officielles.","Trainings-Spielstand für BIOGLOW FLLC 2026–2027. Erfasse geprüfte Bedingungen, übe Runden von 2 Min. 30 Sek. und prüfe offizielle Regeln und Updates.","Tabellone di allenamento BIOGLOW FLLC 2026–2027. Registra le condizioni verificate, esercitati con round da 2 minuti e 30 secondi e consulta regole e aggiornamenti ufficiali.","BIOGLOW FLLC 2026–2027 训练记分板。记录已确认的条件，练习 2 分 30 秒的回合，并查看官方规则和更新。","BIOGLOW FLLC 2026–2027 練習用スコアボードです。確認済みの条件を記録し、2 分 30 秒のラウンドを練習して、公式ルールと更新情報を確認します。","BIOGLOW FLLC 2026–2027 अभ्यास स्कोरबोर्ड। सत्यापित स्थितियाँ दर्ज करें, 2 मिनट 30 सेकंड के राउंड का अभ्यास करें और आधिकारिक नियम व अपडेट देखें।"],
 ["15 missões","15 missions","15 misiones","15 missions","15 Missionen","15 missioni","15 项任务","15 ミッション","15 मिशन"],
 ["150 segundos por round","150 seconds per round","150 segundos por ronda","150 secondes par manche","150 Sekunden pro Runde","150 secondi per round","每回合 150 秒","1 ラウンド 150 秒","प्रति राउंड 150 सेकंड"],
 ["Máximo teórico: 510 pts","Theoretical maximum: 510 pts","Máximo teórico: 510 pts","Maximum théorique : 510 pts","Theoretisches Maximum: 510 Punkte","Massimo teorico: 510 punti","理论最高分：510 分","理論上の最高点：510 点","सैद्धांतिक अधिकतम: 510 अंक"],
 ["Levantamento com Drone","Drone Launch","Lanzamiento del dron","Lancement du drone","Drohnenstart","Lancio del drone","无人机起飞","ドローンの打ち上げ","ड्रोन लॉन्च"],
 ["Lance o drone e vire completamente o mapa LiDAR.","Launch the drone and completely flip the LiDAR map.","Lanza el dron y gira completamente el mapa LiDAR.","Lancez le drone et retournez complètement la carte LiDAR.","Starte die Drohne und drehe die LiDAR-Karte vollständig um.","Lancia il drone e capovolgi completamente la mappa LiDAR.","发射无人机并将 LiDAR 地图完全翻转。","ドローンを飛ばし、LiDAR マップを完全に裏返します。","ड्रोन लॉन्च करें और LiDAR मैप को पूरी तरह पलटें।"],
 ["Drone já não toca o tapete","Drone is no longer touching the mat","El dron ya no toca el tapete","Le drone ne touche plus le tapis","Die Drohne berührt die Matte nicht mehr","Il drone non tocca più il tappeto","无人机不再接触任务垫","ドローンがマットに触れていない","ड्रोन अब मैट को नहीं छू रहा है"],
 ["Sementes Explosivas","Exploding Seeds","Semillas explosivas","Graines explosives","Explosive Samen","Semi esplosivi","爆裂种子","はじける種","विस्फोटक बीज"],
 ["Dispare as sementes para que deixem de tocar o caule.","Shoot the seeds so they no longer touch the stem.","Dispara las semillas para que dejen de tocar el tallo.","Lancez les graines pour qu’elles ne touchent plus la tige.","Schieße die Samen ab, sodass sie den Stängel nicht mehr berühren.","Spara i semi in modo che non tocchino più il gambo.","发射种子，使其不再接触茎。","種を発射して、茎に触れないようにします。","बीजों को इस तरह चलाएँ कि वे तने को छूना बंद कर दें।"],
 ["Vire a Rocha","Flip the Rock","Gira la roca","Retourner le rocher","Drehe den Felsen","Gira la roccia","翻转岩石","岩をひっくり返す","चट्टान पलटें"],
 ["Folhas do Sorte","Fortune Leaves","Hojas de la suerte","Feuilles porte-bonheur","Glücksblätter","Foglie della fortuna","幸运叶片","幸運の葉","भाग्य के पत्ते"],
 ["Raízes que se Estendem","Extending Roots","Raíces que se extienden","Racines qui s’étendent","Wachsende Wurzeln","Radici in espansione","延伸的根","伸びる根","फैलती जड़ें"],
 ["Correria das Formigas Cortadeiras","Leafcutter Ant Rush","Carrera de hormigas cortadoras","Course des fourmis coupeuses","Blattschneiderameisen-Rennen","Corsa delle formiche tagliafoglie","切叶蚁竞速","ハキリアリの競走","पत्ती काटने वाली चींटियों की दौड़"],
 ["Fungo Gigante","Giant Mushroom","Hongo gigante","Champignon géant","Riesenpilz","Fungo gigante","巨型蘑菇","巨大キノコ","विशाल मशरूम"],
 ["Enxame","Swarm","Enjambre","Essaim","Schwarm","Sciame","蜂群","群れ","झुंड"],
 ["Plataforma de Pesquisa","Research Platform","Plataforma de investigación","Plateforme de recherche","Forschungsplattform","Piattaforma di ricerca","研究平台","研究プラットフォーム","अनुसंधान मंच"],
 ["Micro-habitats Frágeis","Fragile Microhabitats","Microhábitats frágiles","Microhabitats fragiles","Empfindliche Mikrohabitate","Microhabitat fragili","脆弱的微栖息地","壊れやすい微小生息地","नाज़ुक सूक्ष्म आवास"],
 ["Janela para o Passado","Window to the Past","Ventana al pasado","Fenêtre sur le passé","Fenster zur Vergangenheit","Finestra sul passato","通往过去的窗口","過去への窓","अतीत की खिड़की"],
 ["Ancião da Floresta","Forest Elder","Anciano del bosque","Ancien de la forêt","Waldältester","Anziano della foresta","森林长者","森の長老","वन का बुज़ुर्ग"],
 ["Espécie-chave","Keystone Species","Especie clave","Espèce clé","Schlüsselart","Specie chiave","关键物种","キーストーン種","प्रमुख प्रजाति"],
 ["Sementes de Renovação","Renewal Seeds","Semillas de renovación","Graines de renouveau","Erneuerungssamen","Semi di rinnovamento","复苏种子","再生の種","नवीनीकरण के बीज"],
 ["Arquitetura Biocinética","Biokinetic Architecture","Arquitectura biocinética","Architecture biocinétique","Biokinetische Architektur","Architettura biocinetica","生物动能建筑","バイオキネティック建築","जैव-गतिज वास्तुकला"],
 ["Restrição de equipamento","Equipment restriction","Restricción de equipo","Restriction d’équipement","Gerätebeschränkung","Restrizione attrezzatura","设备限制","機材の制限","उपकरण प्रतिबंध"],
 ["Pontuação baseada nas condições marcadas. Confirme no campo antes de registrar.","Score is based on the checked conditions. Confirm on the field before recording.","La puntuación se basa en las condiciones marcadas. Confírmalo en el campo antes de registrar.","Le score dépend des conditions cochées. Vérifiez sur le terrain avant d’enregistrer.","Die Punktzahl basiert auf den markierten Bedingungen. Vor dem Speichern auf dem Spielfeld prüfen.","Il punteggio si basa sulle condizioni selezionate. Conferma sul campo prima di registrare.","得分依据已勾选的条件。记录前请在场地上确认。","得点は選択した条件に基づきます。記録する前にフィールドで確認してください。","अंक चुनी गई शर्तों पर आधारित हैं। दर्ज करने से पहले मैदान पर पुष्टि करें।"],
 ["Histórico de rounds","Round history","Historial de rondas","Historique des manches","Rundenverlauf","Cronologia dei round","回合历史","ラウンド履歴","राउंड इतिहास"],
 ["Resultados guardados localmente no navegador.","Results saved locally in this browser.","Resultados guardados localmente en el navegador.","Résultats enregistrés localement dans le navigateur.","Ergebnisse sind lokal in diesem Browser gespeichert.","Risultati salvati localmente nel browser.","结果保存在此浏览器中。","結果はこのブラウザーにローカル保存されています。","परिणाम इस ब्राउज़र में स्थानीय रूप से सहेजे गए हैं।"],
 ["Exportar histórico","Export history","Exportar historial","Exporter l’historique","Verlauf exportieren","Esporta cronologia","导出历史记录","履歴をエクスポート","इतिहास निर्यात करें"],
 ["Apagar histórico","Clear history","Borrar historial","Effacer l’historique","Verlauf löschen","Cancella cronologia","清除历史记录","履歴を消去","इतिहास मिटाएँ"],
 ["Nenhuma rodada guardada ainda.","No saved rounds yet.","Todavía no hay rondas guardadas.","Aucune manche enregistrée pour le moment.","Noch keine Runden gespeichert.","Nessun round salvato.","尚未保存任何回合。","保存されたラウンドはまだありません。","अभी कोई राउंड सहेजा नहीं गया है।"],
 ["Ranking público BIOGLOW","Public BIOGLOW leaderboard","Clasificación pública BIOGLOW","Classement public BIOGLOW","Öffentliche BIOGLOW-Rangliste","Classifica pubblica BIOGLOW","BIOGLOW 公共排行榜","BIOGLOW 公開ランキング","BIOGLOW सार्वजनिक लीडरबोर्ड"],
 ["Consulte as equipes classificadas, a média de pontuação e a quantidade de rounds registrados. Não é necessário ser administrador.","View ranked teams, average scores, and the number of recorded rounds. No administrator access is required.","Consulta los equipos clasificados, la puntuación media y el número de rondas registradas. No necesitas ser administrador.","Consultez les équipes classées, les scores moyens et le nombre de manches enregistrées. Aucun accès administrateur n’est nécessaire.","Sieh dir Teams, Durchschnittspunktzahlen und die Anzahl der erfassten Runden an. Ein Administratorkonto ist nicht erforderlich.","Consulta le squadre in classifica, i punteggi medi e il numero di round registrati. Non è necessario essere amministratore.","查看排名团队、平均分和已记录回合数。无需管理员权限。","順位、平均得点、記録されたラウンド数を確認できます。管理者権限は不要です。","रैंक की गई टीमों, औसत स्कोर और दर्ज राउंड की संख्या देखें। व्यवस्थापक होना आवश्यक नहीं है।"],
 ["Ver ranking público →","View public leaderboard →","Ver clasificación pública →","Voir le classement public →","Öffentliche Rangliste ansehen →","Vedi classifica pubblica →","查看公开排行榜 →","公開ランキングを見る →","सार्वजनिक लीडरबोर्ड देखें →"],
 ["Média dos rounds","Round average","Promedio de rondas","Moyenne des manches","Rundendurchschnitt","Media dei round","回合平均分","ラウンド平均","राउंड का औसत"],
 ["Quantidade","Count","Cantidad","Nombre","Anzahl","Quantità","数量","件数","संख्या"],
 ["Atualizar agora","Refresh now","Actualizar ahora","Actualiser maintenant","Jetzt aktualisieren","Aggiorna ora","立即刷新","今すぐ更新","अभी रिफ़्रेश करें"],
 ["Estratégia de equipe","Team strategy","Estrategia de equipo","Stratégie d’équipe","Teamstrategie","Strategia di squadra","团队策略","チーム戦略","टीम रणनीति"],
 ["Planeje a partida, as prioridades e os modelos intercambiáveis.","Plan the match, priorities, and interchangeable models.","Planifica la partida, las prioridades y los modelos intercambiables.","Planifiez la partie, les priorités et les modèles interchangeables.","Plane die Runde, Prioritäten und austauschbare Modelle.","Pianifica la partita, le priorità e i modelli intercambiabili.","规划比赛、优先事项和可互换模型。","試合、優先事項、交換可能なモデルを計画しましょう。","मैच, प्राथमिकताओं और बदलने योग्य मॉडल की योजना बनाएँ।"],
 ["Nome do plano","Plan name","Nombre del plan","Nom du plan","Name des Plans","Nome del piano","计划名称","計画名","योजना का नाम"],
 ["Objetivo do plano","Plan objective","Objetivo del plan","Objectif du plan","Planziel","Obiettivo del piano","计划目标","計画の目標","योजना का लक्ष्य"],
 ["Consistência","Consistency","Consistencia","Régularité","Beständigkeit","Costanza","稳定性","安定性","निरंतरता"],
 ["Prioridade do round","Round priority","Prioridad de la ronda","Priorité de la manche","Rundenpriorität","Priorità del round","回合优先级","ラウンドの優先度","राउंड प्राथमिकता"],
 ["Missões prioritárias da base","Priority base missions","Misiones prioritarias de la base","Missions prioritaires de la base","Priorisierte Basis-Missionen","Missioni prioritarie della base","基地优先任务","ベースの優先ミッション","आधार के प्राथमिक मिशन"],
 ["Adicionar missão","Add mission","Añadir misión","Ajouter une mission","Mission hinzufügen","Aggiungi missione","添加任务","ミッションを追加","मिशन जोड़ें"],
 ["Limpar rota","Clear route","Limpiar ruta","Effacer l’itinéraire","Route löschen","Pulisci percorso","清除路线","ルートをクリア","मार्ग साफ़ करें"],
 ["Exportar estratégia","Export strategy","Exportar estrategia","Exporter la stratégie","Strategie exportieren","Esporta strategia","导出策略","戦略をエクスポート","रणनीति निर्यात करें"],
 ["Estratégias salvas","Saved strategies","Estrategias guardadas","Stratégies enregistrées","Gespeicherte Strategien","Strategie salvate","已保存策略","保存済み戦略","सहेजी गई रणनीतियाँ"],
 ["Salvar plano","Save plan","Guardar plan","Enregistrer le plan","Plan speichern","Salva piano","保存计划","計画を保存","योजना सहेजें"],
 ["Regras essenciais","Essential rules","Reglas esenciales","Règles essentielles","Wichtige Regeln","Regole essenziali","核心规则","基本ルール","मुख्य नियम"],
 ["Regras especiais e restrições","Special rules and restrictions","Reglas especiales y restricciones","Règles spéciales et restrictions","Sonderregeln und Einschränkungen","Regole speciali e restrizioni","特殊规则和限制","特別ルールと制限","विशेष नियम और प्रतिबंध"],
 ["Fontes oficiais e consulta","Official sources and references","Fuentes oficiales y consulta","Sources officielles et références","Offizielle Quellen und Nachschlagen","Fonti ufficiali e consultazione","官方来源与参考","公式資料と参照先","आधिकारिक स्रोत और संदर्भ"],
 ["Duração da partida: 2 minutos e 30 segundos","Match duration: 2 minutes and 30 seconds","Duración de la partida: 2 minutos y 30 segundos","Durée de la partie : 2 minutes et 30 secondes","Spieldauer: 2 Minuten und 30 Sekunden","Durata della partita: 2 minuti e 30 secondi","比赛时长：2 分 30 秒","試合時間：2 分 30 秒","मैच की अवधि: 2 मिनट 30 सेकंड"],
 ["Duas áreas de lançamento na casa","Two launch areas at home","Dos áreas de lanzamiento en casa","Deux zones de lancement à la base","Zwei Startbereiche in der Basis","Due aree di lancio alla base","基地内有两个发射区","基地には 2 つの発射エリアがあります","बेस में दो लॉन्च क्षेत्र"],
 ["Interrupções e fichas de precisão","Interruptions and precision tokens","Interrupciones y fichas de precisión","Interruptions et jetons de précision","Unterbrechungen und Präzisionsmarken","Interruzioni e gettoni di precisione","中断与精度标记","中断と精度トークン","रुकावटें और सटीकता टोकन"],
 ["Inspeção pré-round: +20 pontos","Pre-round inspection: +20 points","Inspección previa: +20 puntos","Inspection avant manche : +20 points","Inspektion vor der Runde: +20 Punkte","Ispezione pre-round: +20 punti","回合前检查：+20 分","ラウンド前点検：+20 点","राउंड-पूर्व निरीक्षण: +20 अंक"],
 ["Controle de limpeza do round","Round cleanup controls","Controles de limpieza de la ronda","Contrôles de nettoyage de la manche","Kontrollen zur Rundenbereinigung","Controlli di pulizia del round","回合清理控制","ラウンドの片付け管理","राउंड सफ़ाई नियंत्रण"],
 ["Limpar condições desta missão","Clear conditions for this mission","Limpiar condiciones de esta misión","Effacer les conditions de cette mission","Bedingungen dieser Mission löschen","Pulisci le condizioni di questa mission","清除此任务条件","このミッションの条件をクリア","इस मिशन की शर्तें साफ़ करें"],
 ["Zerar round inteiro","Reset entire round","Reiniciar toda la ronda","Réinitialiser toute la manche","Gesamte Runde zurücksetzen","Azzera l’intero round","重置整回合","ラウンド全体をリセット","पूरा राउंड रीसेट करें"],
 ["Vídeos encontrados","Videos found","Vídeos encontrados","Vidéos trouvées","Gefundene Videos","Video trovati","找到的视频","見つかった動画","मिले हुए वीडियो"],
 ["Vídeos fixados","Pinned videos","Vídeos fijados","Vidéos épinglées","Angeheftete Videos","Video fissati","固定视频","固定された動画","पिन किए गए वीडियो"],
 ["Pesquise vídeos e assista sem sair do Rabbitech BIOGLOW.","Search for videos and watch without leaving Rabbitech BIOGLOW.","Busca vídeos y míralos sin salir de Rabbitech BIOGLOW.","Recherchez des vidéos et regardez-les sans quitter Rabbitech BIOGLOW.","Suche Videos und sieh sie dir an, ohne Rabbitech BIOGLOW zu verlassen.","Cerca video e guardali senza uscire da Rabbitech BIOGLOW.","搜索视频并在 Rabbitech BIOGLOW 中直接观看。","Rabbitech BIOGLOW を離れずに動画を検索して視聴できます。","वीडियो खोजें और Rabbitech BIOGLOW छोड़े बिना देखें।"],
 ["Escolher vídeo do YouTube","Choose YouTube video","Elegir vídeo de YouTube","Choisir une vidéo YouTube","YouTube-Video auswählen","Scegli video YouTube","选择 YouTube 视频","YouTube 動画を選択","YouTube वीडियो चुनें"],
 ["Pesquisar","Search","Buscar","Rechercher","Suchen","Cerca","搜索","検索","खोजें"],
 ["Atualizar vídeos","Refresh videos","Actualizar vídeos","Actualiser les vidéos","Videos aktualisieren","Aggiorna video","刷新视频","動画を更新","वीडियो रिफ़्रेश करें"],
 ["Assistir link","Watch link","Ver enlace","Regarder le lien","Link ansehen","Guarda il link","观看链接","リンクを視聴","लिंक देखें"],
 ["Rabbitech Música","Rabbitech Music","Música Rabbitech","Musique Rabbitech","Rabbitech Musik","Musica Rabbitech","Rabbitech 音乐","Rabbitech ミュージック","Rabbitech संगीत"],
 ["Escolher áudio do dispositivo","Choose audio from device","Elegir audio del dispositivo","Choisir un audio sur l’appareil","Audio vom Gerät auswählen","Scegli audio dal dispositivo","选择设备中的音频","端末から音声を選択","डिवाइस से ऑडियो चुनें"],
 ["Escolher arquivo","Choose file","Elegir archivo","Choisir un fichier","Datei auswählen","Scegli file","选择文件","ファイルを選択","फ़ाइल चुनें"],
 ["Nenhum arquivo escolhido","No file chosen","Ningún archivo seleccionado","Aucun fichier sélectionné","Keine Datei ausgewählt","Nessun file selezionato","未选择文件","ファイルが選択されていません","कोई फ़ाइल नहीं चुनी गई"],
 ["Carregar áudio","Load audio","Cargar audio","Charger l’audio","Audio laden","Carica audio","加载音频","音声を読み込む","ऑडियो लोड करें"],
 ["Parar","Stop","Detener","Arrêter","Stoppen","Ferma","停止","停止","रोकें"],
 ["Política de Privacidade e Proteção de Dados","Privacy and Data Protection Policy","Política de privacidad y protección de datos","Politique de confidentialité et de protection des données","Datenschutzrichtlinie","Informativa sulla privacy e protezione dei dati","隐私与数据保护政策","プライバシーとデータ保護ポリシー","गोपनीयता और डेटा सुरक्षा नीति"],
 ["Dados de equipe","Team data","Datos del equipo","Données de l’équipe","Teamdaten","Dati della squadra","团队数据","チームデータ","टीम डेटा"],
 ["Armazenamento e segurança","Storage and security","Almacenamiento y seguridad","Stockage et sécurité","Speicherung und Sicherheit","Archiviazione e sicurezza","存储与安全","保存とセキュリティ","भंडारण और सुरक्षा"],
 ["Crianças e adolescentes","Children and teenagers","Niños y adolescentes","Enfants et adolescents","Kinder und Jugendliche","Bambini e adolescenti","儿童与青少年","子どもと青少年","बच्चे और किशोर"],
 ["Seus direitos","Your rights","Tus derechos","Vos droits","Ihre Rechte","I tuoi diritti","您的权利","あなたの権利","आपके अधिकार"],
 ["Base legal e legislação","Legal basis and legislation","Base legal y legislación","Base juridique et législation","Rechtsgrundlage und Gesetzgebung","Base giuridica e legislazione","法律依据与法规","法的根拠と法令","कानूनी आधार और कानून"],
 ["Referências oficiais","Official references","Referencias oficiales","Références officielles","Offizielle Referenzen","Riferimenti ufficiali","官方参考资料","公式参考資料","आधिकारिक संदर्भ"],
 ["Conectado como","Signed in as","Conectado como","Connecté en tant que","Angemeldet als","Connesso come","当前登录账户","ログイン中：","इस रूप में लॉग इन हैं:"],
 ["Equipe:","Team:","Equipo:","Équipe :","Team:","Squadra:","团队：","チーム：","टीम:"],
 ["na nuvem.","in the cloud.","en la nube.","dans le cloud.","in der Cloud.","nel cloud.","在云端。","クラウド上。","क्लाउड में।"],
 ["Mostrar opções da nuvem","Show cloud options","Mostrar opciones de la nube","Afficher les options cloud","Cloud-Optionen anzeigen","Mostra opzioni cloud","显示云端选项","クラウドのオプションを表示","क्लाउड विकल्प दिखाएँ"],
 ["Sincronizar histórico e atualizar nuvem","Sync history and update cloud","Sincronizar historial y actualizar la nube","Synchroniser l’historique et mettre à jour le cloud","Verlauf synchronisieren und Cloud aktualisieren","Sincronizza cronologia e aggiorna il cloud","同步历史记录并更新云端","履歴を同期してクラウドを更新","इतिहास सिंक करें और क्लाउड अपडेट करें"],
 ["Nome da equipe (obrigatório)","Team name (required)","Nombre del equipo (obligatorio)","Nom de l’équipe (obligatoire)","Teamname (erforderlich)","Nome della squadra (obbligatorio)","团队名称（必填）","チーム名（必須）","टीम का नाम (अनिवार्य)"],
 ["Entre com sua conta Google e depois escolha: criar uma equipe como mentor ou entrar em uma equipe existente com o código de convite. O responsável gera e compartilha o código com os membros.","Sign in with your Google account, then choose to create a team as a mentor or join an existing team with an invitation code. The mentor generates and shares the code with members.","Inicia sesión con Google y después elige crear un equipo como mentor o unirte a uno existente con un código de invitación. El responsable genera y comparte el código con los miembros.","Connectez-vous avec Google, puis choisissez de créer une équipe en tant que mentor ou de rejoindre une équipe existante avec un code d’invitation. Le responsable génère et partage le code.","Melde dich mit Google an und erstelle als Mentor ein Team oder tritt einem bestehenden Team mit Einladungscode bei. Die verantwortliche Person erstellt und teilt den Code.","Accedi con Google, poi crea una squadra come mentore o unisciti a una squadra esistente con un codice invito. Il responsabile genera e condivide il codice.","使用 Google 账号登录，然后选择以导师身份创建团队，或使用邀请码加入现有团队。负责人生成并分享邀请码。","Google アカウントでログインし、メンターとしてチームを作成するか、招待コードで既存のチームに参加します。担当者がコードを発行してメンバーに共有します。","अपने Google खाते से साइन इन करें, फिर मेंटर के रूप में टीम बनाएँ या आमंत्रण कोड से मौजूदा टीम में शामिल हों। ज़िम्मेदार व्यक्ति कोड बनाकर सदस्यों से साझा करता है।"],
 ["Tarefas criadas","Tasks created","Tareas creadas","Tâches créées","Erstellte Aufgaben","Attività create","已创建任务","作成したタスク","बनाए गए कार्य"],
 ["Tarefas concluídas","Tasks completed","Tareas completadas","Tâches terminées","Abgeschlossene Aufgaben","Attività completate","已完成任务","完了したタスク","पूरे किए गए कार्य"],
 ["Progresso das tarefas","Task progress","Progreso de tareas","Progression des tâches","Aufgabenfortschritt","Avanzamento attività","任务进度","タスクの進捗","कार्य प्रगति"],
 ["Média dos rounds - 0 registros","Round average - 0 records","Promedio de rondas: 0 registros","Moyenne des manches : 0 enregistrement","Rundendurchschnitt – 0 Einträge","Media round - 0 registrazioni","回合平均分 - 0 条记录","ラウンド平均 - 0 件","राउंड औसत - 0 रिकॉर्ड"],
 ["Tendência: Ainda sem dados suficientes","Trend: Not enough data yet","Tendencia: aún no hay datos suficientes","Tendance : pas encore assez de données","Trend: Noch nicht genügend Daten","Tendenza: dati ancora insufficienti","趋势：数据仍然不足","傾向：まだデータが足りません","रुझान: अभी पर्याप्त डेटा नहीं है"],
 ["Convidar membros","Invite members","Invitar miembros","Inviter des membres","Mitglieder einladen","Invita membri","邀请成员","メンバーを招待","सदस्यों को आमंत्रित करें"],
 ["Gerar convite","Generate invitation","Generar invitación","Générer une invitation","Einladung erstellen","Genera invito","生成邀请","招待を作成","आमंत्रण बनाएँ"],
 ["Nova tarefa","New task","Nueva tarea","Nouvelle tâche","Neue Aufgabe","Nuova attività","新任务","新しいタスク","नया कार्य"],
 ["Tarefa","Task","Tarea","Tâche","Aufgabe","Attività","任务","タスク","कार्य"],
 ["Prazo","Deadline","Fecha límite","Échéance","Frist","Scadenza","截止日期","期限","समय-सीमा"],
 ["Prioridade","Priority","Prioridad","Priorité","Priorität","Priorità","优先级","優先度","प्राथमिकता"],
 ["Normal","Normal","Normal","Normale","Normal","Normale","普通","通常","सामान्य"],
 ["Atribuir a","Assign to","Asignar a","Attribuer à","Zuweisen an","Assegna a","分配给","割り当て先","इन्हें सौंपें"],
 ["Equipe toda","Entire team","Todo el equipo","Toute l’équipe","Ganzes Team","Tutta la squadra","整个团队","チーム全員","पूरी टीम"],
 ["Adicionar tarefa","Add task","Añadir tarea","Ajouter une tâche","Aufgabe hinzufügen","Aggiungi attività","添加任务","タスクを追加","कार्य जोड़ें"],
 ["Quadro Kanban","Kanban board","Tablero Kanban","Tableau Kanban","Kanban-Board","Bacheca Kanban","看板","かんばんボード","कानबन बोर्ड"],
 ["A fazer","To do","Por hacer","À faire","Zu erledigen","Da fare","待办","未着手","करना है"],
 ["Em andamento","In progress","En curso","En cours","In Bearbeitung","In corso","进行中","進行中","प्रगति में"],
 ["Concluído","Done","Completado","Terminé","Erledigt","Completato","已完成","完了","पूरा हुआ"],
 ["Metas da equipe","Team goals","Metas del equipo","Objectifs de l’équipe","Teamziele","Obiettivi della squadra","团队目标","チーム目標","टीम के लक्ष्य"],
 ["Metas e progresso","Goals and progress","Metas y progreso","Objectifs et progression","Ziele und Fortschritt","Obiettivi e avanzamento","目标与进度","目標と進捗","लक्ष्य और प्रगति"],
 ["O mentor ainda não cadastrou metas.","The mentor has not added any goals yet.","El mentor aún no ha registrado metas.","Le mentor n’a pas encore ajouté d’objectifs.","Der Mentor hat noch keine Ziele eingetragen.","Il mentore non ha ancora inserito obiettivi.","导师尚未设置目标。","メンターはまだ目標を登録していません。","मेंटर ने अभी तक लक्ष्य नहीं जोड़े हैं।"],
 ["Meta","Goal","Meta","Objectif","Ziel","Obiettivo","目标","目標","लक्ष्य"],
 ["Salvar meta","Save goal","Guardar meta","Enregistrer l’objectif","Ziel speichern","Salva obiettivo","保存目标","目標を保存","लक्ष्य सहेजें"],
 ["Registrar round de treino","Record practice round","Registrar ronda de práctica","Enregistrer une manche d’entraînement","Trainingsrunde erfassen","Registra round di allenamento","记录训练回合","練習ラウンドを記録","अभ्यास राउंड दर्ज करें"],
 ["Número do round","Round number","Número de ronda","Numéro de manche","Rundennummer","Numero del round","回合编号","ラウンド番号","राउंड संख्या"],
 ["Pontuação","Score","Puntuación","Score","Punktzahl","Punteggio","得分","得点","स्कोर"],
 ["Onde começou","Starting position","Dónde comenzó","Position de départ","Startposition","Posizione iniziale","起始位置","開始位置","शुरुआती स्थान"],
 ["Missões tentadas","Missions attempted","Misiones intentadas","Missions tentées","Versuchte Missionen","Missioni tentate","尝试的任务","挑戦したミッション","प्रयास की गई मिशन"],
 ["Observações do round","Round notes","Observaciones de la ronda","Notes de la manche","Rundennotizen","Note del round","回合备注","ラウンドのメモ","राउंड टिप्पणियाँ"],
 ["Salvar round","Save round","Guardar ronda","Enregistrer la manche","Runde speichern","Salva round","保存回合","ラウンドを保存","राउंड सहेजें"],
 ["Desempenho dos rounds","Round performance","Rendimiento de rondas","Performances des manches","Rundenleistung","Prestazioni dei round","回合表现","ラウンドの成績","राउंड प्रदर्शन"],
 ["Média atual: 0 pontos","Current average: 0 points","Promedio actual: 0 puntos","Moyenne actuelle : 0 points","Aktueller Durchschnitt: 0 Punkte","Media attuale: 0 punti","当前平均：0 分","現在の平均：0 点","वर्तमान औसत: 0 अंक"],
 ["Notas compartilhadas","Shared notes","Notas compartidas","Notes partagées","Geteilte Notizen","Note condivise","共享笔记","共有メモ","साझा नोट्स"],
 ["Título da nota","Note title","Título de la nota","Titre de la note","Notiztitel","Titolo della nota","笔记标题","メモのタイトル","नोट का शीर्षक"],
 ["Salvar anotação","Save note","Guardar nota","Enregistrer la note","Notiz speichern","Salva nota","保存笔记","メモを保存","नोट सहेजें"],
 ["Chat da equipe","Team chat","Chat del equipo","Chat de l’équipe","Team-Chat","Chat della squadra","团队聊天","チームチャット","टीम चैट"],
 ["Mensagens de texto compartilhadas entre membros. Sem chamadas.","Text messages shared between members. No calls.","Mensajes de texto compartidos entre miembros. Sin llamadas.","Messages texte partagés entre les membres. Pas d’appels.","Textnachrichten zwischen Mitgliedern. Keine Anrufe.","Messaggi di testo condivisi tra membri. Nessuna chiamata.","成员之间共享文字消息。不支持通话。","メンバー間でテキストメッセージを共有します。通話はありません。","सदस्यों के बीच साझा टेक्स्ट संदेश। कॉल सुविधा नहीं।"],
 ["Escreva para a equipe","Write to the team","Escribe al equipo","Écrire à l’équipe","An das Team schreiben","Scrivi alla squadra","给团队发送消息","チームにメッセージを書く","टीम को संदेश लिखें"],
 ["Enviar mensagem","Send message","Enviar mensaje","Envoyer le message","Nachricht senden","Invia messaggio","发送消息","メッセージを送信","संदेश भेजें"],
 ["Apagar mensagem","Delete message","Eliminar mensaje","Supprimer le message","Nachricht löschen","Elimina messaggio","删除消息","メッセージを削除","संदेश हटाएँ"],
 ["Rabbitech","Rabbitech","Rabbitech","Rabbitech","Rabbitech","Rabbitech","Rabbitech","Rabbitech","Rabbitech"],
 ["Ativar notificações","Enable notifications","Activar notificaciones","Activer les notifications","Benachrichtigungen aktivieren","Attiva notifiche","启用通知","通知を有効にする","सूचनाएँ चालू करें"],
 ["Atualizar histórico","Refresh history","Actualizar historial","Actualiser l’historique","Verlauf aktualisieren","Aggiorna cronologia","刷新历史记录","履歴を更新","इतिहास रिफ़्रेश करें"],
 ["Administradores","Administrators","Administradores","Administrateurs","Administratoren","Amministratori","管理员","管理者","व्यवस्थापक"],
 ["Somente o proprietário pode adicionar ou remover administradores.","Only the owner can add or remove administrators.","Solo el propietario puede añadir o quitar administradores.","Seul le propriétaire peut ajouter ou supprimer des administrateurs.","Nur der Eigentümer kann Administratoren hinzufügen oder entfernen.","Solo il proprietario può aggiungere o rimuovere amministratori.","只有所有者可以添加或移除管理员。","所有者のみが管理者を追加・削除できます。","केवल मालिक व्यवस्थापकों को जोड़ या हटा सकता है।"],
 ["E-mail Google","Google email","Correo de Google","E-mail Google","Google-E-Mail","E-mail Google","Google 邮箱","Google メールアドレス","Google ईमेल"],
 ["Adicionar administrador","Add administrator","Añadir administrador","Ajouter un administrateur","Administrator hinzufügen","Aggiungi amministratore","添加管理员","管理者を追加","व्यवस्थापक जोड़ें"],
 ["Histórico de segurança","Security history","Historial de seguridad","Historique de sécurité","Sicherheitsverlauf","Cronologia sicurezza","安全记录","セキュリティ履歴","सुरक्षा इतिहास"],
 ["Atualizar painel","Refresh dashboard","Actualizar panel","Actualiser le panneau","Dashboard aktualisieren","Aggiorna pannello","刷新面板","パネルを更新","डैशबोर्ड रिफ़्रेश करें"],
 ["Avisos globais","Global notices","Avisos globales","Annonces globales","Globale Hinweise","Avvisi globali","全局通知","全体のお知らせ","वैश्विक सूचनाएँ"],
 ["Publicar aviso","Publish notice","Publicar aviso","Publier l’avis","Hinweis veröffentlichen","Pubblica avviso","发布通知","お知らせを公開","सूचना प्रकाशित करें"],
 ["Remover aviso","Remove notice","Eliminar aviso","Supprimer l’avis","Hinweis entfernen","Rimuovi avviso","移除通知","お知らせを削除","सूचना हटाएँ"],
 ["Aparência global","Global appearance","Apariencia global","Apparence globale","Globales Erscheinungsbild","Aspetto globale","全局外观","全体の外観","वैश्विक रूप"],
 ["Cor de destaque","Accent color","Color de acento","Couleur d’accentuation","Akzentfarbe","Colore di evidenziazione","强调色","アクセントカラー","एक्सेंट रंग"],
 ["Nome do tema","Theme name","Nombre del tema","Nom du thème","Themenname","Nome del tema","主题名称","テーマ名","थीम का नाम"],
 ["Salvar aparência global","Save global appearance","Guardar apariencia global","Enregistrer l’apparence globale","Globales Erscheinungsbild speichern","Salva aspetto globale","保存全局外观","全体の外観を保存","वैश्विक रूप सहेजें"],
 ["Manutenção","Maintenance","Mantenimiento","Maintenance","Wartung","Manutenzione","维护模式","メンテナンス","रखरखाव"],
 ["Modo de manutenção","Maintenance mode","Modo de mantenimiento","Mode maintenance","Wartungsmodus","Modalità manutenzione","维护模式","メンテナンスモード","रखरखाव मोड"],
 ["Central de atualizações","Update center","Centro de actualizaciones","Centre des mises à jour","Update-Center","Centro aggiornamenti","更新中心","更新センター","अपडेट केंद्र"],
 ["Diagnóstico do sistema","System diagnostics","Diagnóstico del sistema","Diagnostic du système","Systemdiagnose","Diagnostica di sistema","系统诊断","システム診断","सिस्टम निदान"],
 ["Saúde do sistema","System health","Estado del sistema","État du système","Systemstatus","Stato del sistema","系统健康状态","システムの状態","सिस्टम स्वास्थ्य"],
 ["Carregando...","Loading...","Cargando...","Chargement...","Wird geladen...","Caricamento...","正在加载...","読み込み中...","लोड हो रहा है..."],
 ["Nenhum resultado","No results","Sin resultados","Aucun résultat","Keine Ergebnisse","Nessun risultato","没有结果","結果がありません","कोई परिणाम नहीं"],
 ["Nenhum dado disponível","No data available","No hay datos disponibles","Aucune donnée disponible","Keine Daten verfügbar","Nessun dato disponibile","没有可用数据","利用可能なデータがありません","कोई डेटा उपलब्ध नहीं"],
 ["Tentar novamente","Try again","Intentar de nuevo","Réessayer","Erneut versuchen","Riprova","重试","もう一度試す","फिर कोशिश करें"],
 ["Erro","Error","Error","Erreur","Fehler","Errore","错误","エラー","त्रुटि"],
 ["Sucesso","Success","Éxito","Succès","Erfolg","Successo","成功","成功","सफलता"],
 ["Aviso","Notice","Aviso","Avis","Hinweis","Avviso","提示","お知らせ","सूचना"],
 ["Informação","Information","Información","Information","Information","Informazione","信息","情報","जानकारी"],
 ["Agendado","Scheduled","Programado","Planifié","Geplant","Programmato","已安排","予定済み","निर्धारित"],
 ["Ativo","Active","Activo","Actif","Aktiv","Attivo","启用","有効","सक्रिय"],
 ["Inativo","Inactive","Inactivo","Inactif","Inaktiv","Inattivo","停用","無効","निष्क्रिय"],
 ["Idioma","Language","Idioma","Langue","Sprache","Lingua","语言","言語","भाषा"],
 ["Idioma / Language","Language / Language","Idioma / Language","Langue / Language","Sprache / Language","Lingua / Language","语言 / Language","言語 / Language","भाषा / Language"],
 ["Privacidade e idioma","Privacy and language","Privacidad e idioma","Confidentialité et langue","Datenschutz und Sprache","Privacy e lingua","隐私与语言","プライバシーと言語","गोपनीयता और भाषा"],
 ["Escolha o idioma do site e leia o aviso de privacidade antes de continuar.","Choose the site language and read the privacy notice before continuing.","Elige el idioma del sitio y lee el aviso de privacidad antes de continuar.","Choisissez la langue du site et lisez l’avis de confidentialité avant de continuer.","Wähle die Sprache der Website und lies den Datenschutzhinweis, bevor du fortfährst.","Scegli la lingua del sito e leggi l’informativa sulla privacy prima di continuare.","请选择网站语言并阅读隐私提示后再继续。","サイトの言語を選び、プライバシー通知を読んでから続行してください。","जारी रखने से पहले साइट की भाषा चुनें और गोपनीयता सूचना पढ़ें।"],
 ["Li e aceito continuar","I have read and agree to continue","He leído y acepto continuar","J’ai lu et j’accepte de continuer","Ich habe gelesen und stimme zu","Ho letto e accetto di continuare","我已阅读并同意继续","内容を読み、続行することに同意します","मैंने पढ़ लिया है और आगे बढ़ने के लिए सहमत हूँ"],
 ["Escolha uma rota confiável","Choose a reliable route","Elige una ruta fiable","Choisissez un itinéraire fiable","Wähle eine zuverlässige Route","Scegli un percorso affidabile","选择可靠的路线","信頼できるルートを選択","विश्वसनीय मार्ग चुनें"],
 ["Teste nas condições da competição","Test under competition conditions","Prueba en condiciones de competición","Testez dans les conditions de compétition","Unter Wettbewerbsbedingungen testen","Prova in condizioni di gara","在比赛条件下测试","大会の条件でテスト","प्रतियोगिता की परिस्थितियों में परीक्षण करें"],
 ["Evite interrupções fora da casa","Avoid interruptions outside home","Evita interrupciones fuera de la base","Évitez les interruptions hors de la base","Vermeide Unterbrechungen außerhalb der Basis","Evita interruzioni fuori dalla base","避免在基地外中断","ベース外での中断を避ける","बेस के बाहर रुकावटों से बचें"],
 ["Planeje a M07 com a equipe adversária","Plan M07 with the opposing team","Planifica M07 con el equipo contrario","Planifiez M07 avec l’équipe adverse","Plane M07 mit dem gegnerischen Team","Pianifica M07 con la squadra avversaria","与对方团队规划 M07","相手チームと M07 を計画","विरोधी टीम के साथ M07 की योजना बनाएँ"],
 ["Pronto para a próxima rodada","Ready for the next round","Listo para la próxima ronda","Prêt pour la prochaine manche","Bereit für die nächste Runde","Pronto per il prossimo round","准备迎接下一回合","次のラウンドの準備完了","अगले राउंड के लिए तैयार"]
 ];
 const maps=new Map(),lowerMaps=new Map();
 R.forEach((row,index)=>row.forEach((phrase,langIndex)=>{if(!phrase)return;const v=norm(phrase);if(!maps.has(v))maps.set(v,{row,index,langIndex});const lo=v.toLocaleLowerCase();if(!lowerMaps.has(lo))lowerMaps.set(lo,{row,index,langIndex});}));
 function norm(s){return String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();}
 function locale(){
  let v='pt-BR';try{v=localStorage.getItem('rbPreferredLanguage')||v}catch(_){}
  v=String(v).replace('_','-').toLowerCase();
  if(v==='zh'||v.startsWith('zh-'))return 'zh-CN';
  if(v==='jp'||v.startsWith('ja'))return 'ja';
  if(v==='hi'||v.startsWith('hi'))return 'hi';
  if(v.startsWith('pt'))return 'pt-BR';if(v.startsWith('en'))return 'en';if(v.startsWith('es'))return 'es';if(v.startsWith('fr'))return 'fr';if(v.startsWith('de'))return 'de';if(v.startsWith('it'))return 'it';
  return 'pt-BR';
 }
 function languageIndex(code){const i=CODES.indexOf(code);return i<0?0:i;}
 function excluded(el){
  return !el||!!el.closest('script,style,code,pre,textarea,input,[contenteditable="true"],[data-user-content],#rbGlobalNotice,[data-global-notice-text],[data-global-notice-message],.global-notice-text,.global-notice-message,#rbTeamChatMessages,#rbTeamNotesList,.rb-team-message,.rb-team-note-body');
 }
 function translateNode(node,langIndex){
  if(!node||node.nodeType!==Node.TEXT_NODE||excluded(node.parentElement))return;
  const raw=node.nodeValue||'',v=norm(raw);if(!v)return;
  let found=maps.get(v)||lowerMaps.get(v.toLocaleLowerCase());
  if(!found)return;
  let target=found.row[langIndex]||found.row[0];
  if(v===v.toLocaleUpperCase()&&/[A-Za-zÀ-ÿ]/.test(v))target=target.toLocaleUpperCase();
  const lead=raw.match(/^\s*/)?.[0]||'',trail=raw.match(/\s*$/)?.[0]||'';
  const next=lead+target+trail;
  if(node.nodeValue!==next)node.nodeValue=next;
 }
 function translateAttributes(root,langIndex){
  const selector='[placeholder],[title],[aria-label],[alt]';
  const els=[];if(root.nodeType===Node.ELEMENT_NODE&&root.matches?.(selector))els.push(root);
  root.querySelectorAll?.(selector).forEach(el=>els.push(el));
  for(const el of els){
   if(excluded(el))continue;
   for(const attr of ['placeholder','title','aria-label','alt']){
    const raw=el.getAttribute(attr);if(!raw)continue;
    const found=maps.get(norm(raw))||lowerMaps.get(norm(raw).toLocaleLowerCase());
    if(found){const next=found.row[langIndex]||found.row[0];if(next!==raw)el.setAttribute(attr,next);}
   }
  }
 }
 function translateTree(root,code){
  if(!root)return;const idx=languageIndex(code),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>translateNode(n,idx));
  translateAttributes(root,idx);
  translateDynamicStatus(root,code);
 }
 function translateDynamicStatus(root,code){
  const idx=languageIndex(code),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  const labels={
   'pt-BR':{signed:'Conectado como ',team:'Equipe: ',rounds:' round(s) na nuvem.'},
   en:{signed:'Signed in as ',team:'Team: ',rounds:' round(s) in the cloud.'},
   es:{signed:'Conectado como ',team:'Equipo: ',rounds:' rondas en la nube.'},
   fr:{signed:'Connecté en tant que ',team:'Équipe : ',rounds:' manche(s) dans le cloud.'},
   de:{signed:'Angemeldet als ',team:'Team: ',rounds:' Runde(n) in der Cloud.'},
   it:{signed:'Connesso come ',team:'Squadra: ',rounds:' round nel cloud.'},
   'zh-CN':{signed:'当前登录账户：',team:'团队：',rounds:' 个回合在云端。'},
   ja:{signed:'ログイン中：',team:'チーム：',rounds:' ラウンドをクラウドに保存。'},
   hi:{signed:'इस रूप में लॉग इन हैं: ',team:'टीम: ',rounds:' राउंड क्लाउड में।'}
  };
  const t=labels[code]||labels['pt-BR'];
  for(const n of nodes){
   if(excluded(n.parentElement))continue;const text=norm(n.nodeValue);
   const m=text.match(/^Conectado como (.+?)\. Equipe: (.+?), (\d+) round\(s\) na nuvem\.$/)||
    text.match(/^Signed in as (.+?)\. Team: (.+?), (\d+) round\(s\) in the cloud\.$/);
   if(m){const next=t.signed+m[1]+'. '+t.team+m[2]+', '+m[3]+t.rounds;if(n.nodeValue!==next)n.nodeValue=next;}
  }
 }
 function addLanguageOptions(){
  const selectors=[...document.querySelectorAll('#rbConsentLanguage,#rbLanguageQuickSelect,#rbLanguageGateSelect,select[id*="language" i],select[name*="language" i]')];
  selectors.forEach(sel=>{
   LANGS.forEach(([code,name])=>{
    if(![...sel.options].some(o=>o.value===code)){
     const opt=document.createElement('option');opt.value=code;opt.textContent=name;sel.appendChild(opt);
    }
   });
   const pref=locale();if([...sel.options].some(o=>o.value===pref))sel.value=pref;
  });
 }
 let applying=false;
 function apply(code){
  const wanted=CODES.includes(code)?code:locale();
  if(applying)return;applying=true;
  try{
   try{localStorage.setItem('rbPreferredLanguage',wanted)}catch(_){}
   document.documentElement.lang=wanted;
   addLanguageOptions();
   document.querySelectorAll('#rbConsentLanguage,#rbLanguageQuickSelect,#rbLanguageGateSelect,select[id*="language" i],select[name*="language" i]').forEach(sel=>{if([...sel.options].some(o=>o.value===wanted))sel.value=wanted;});
   translateTree(document.body,wanted);
   document.documentElement.lang=wanted;
  }finally{applying=false;}
 }
 function languageSelect(el){
  return el instanceof HTMLSelectElement&&(/language/i.test(el.id+' '+el.name)||el.id==='rbConsentLanguage'||el.id==='rbLanguageQuickSelect'||el.id==='rbLanguageGateSelect'||el.closest('#rbLanguageQuick,#rbLanguageGateQuick'));
 }
 function bind(){
  addLanguageOptions();
  // Capture the user's selection before legacy consent controllers normalize it.
  document.addEventListener('change',event=>{
   const el=event.target;if(!languageSelect(el))return;
   const wanted=el.value;if(!CODES.includes(wanted))return;
   window.setTimeout(()=>apply(wanted),80);
   window.setTimeout(()=>apply(wanted),260);
  },true);
  apply(locale());
  const observer=new MutationObserver(records=>{
   const code=locale();
   for(const record of records)for(const n of record.addedNodes){
    if(n.nodeType===Node.ELEMENT_NODE){if(excluded(n))continue;translateTree(n,code);}
    else if(n.nodeType===Node.TEXT_NODE)translateNode(n,languageIndex(code));
   }
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.rbCompleteI18n={apply,locale,languages:LANGS.map(x=>({code:x[0],name:x[1]}))};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();