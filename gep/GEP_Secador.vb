
Function GEP_Secador()

'Tip:
' 1. Use the <CTRL+SPACE> or <CTRL+I> shortcut to open a list of all objects and functions
' 2. Write the code using the HMI Runtime object.
'  Example: HmiRuntime.Screens("Screen_1").
' 3. Use the <CTRL+J> shortcut to create an object reference.
'Write the code as of this position:

'Create Folder
Dim DataTime
Dim folder_y_m, folder_day, ULT0 , filepath, var, header , filepath_C
Dim fso, fso1, fso2, fso3  
Dim H, Min, S, d, Mon, Y

Dim i 
Dim val(86)



val(10)=SmartTags("E1T01_SIN_FUN_FLOAT")' E1T01_SIN_FUN_FLOAT - Sinaliza funcionando Secador de Escória (1 - Ligado e 2 - Desligado)
val(11)=SmartTags("E2P03T1.STS_O_Sinal_EU")' E2P03T1_LEI_TEMP - Leitura temperatura na saída do queimador de cavacos
val(12)=SmartTags("E1T03T1.STS_O_Sinal_EU")' E1T03T1_LEI_TEMP - Leitura temperatura na entrada do secador de escória
val(13)=SmartTags("X1T01P1.STS_O_Sinal_EU")'  X1T01P1_LEI_PRES - Leitura pressão do ar comprimido na saída do compressor
val(14)=SmartTags("CCM1T1.STS_O_Sinal_EU")'  CCM1T1_LEI_TEMP - Leitura temperatura na sala do CCM
val(15)=SmartTags("E1P06.Sts_Pos")' E1P06_LEI_POS - Leitura posição válvula motorizada ar frio da entrada do filtro do secador
val(16)=SmartTags("L2L01S1.STS_O_Sinal_EU")' L2L01S1_LEI_PES - Leitura peso do silo de cavacos
val(17)=SmartTags("M1J09_SP_Ton")' M1J09_val(_INS_SET_POI - val(or inserido no set-point de T/h da produção do secador de escória
val(18)=SmartTags("L2L01S1.STS_O_Sinal_EU") 'L1P01P1_LEI_PRES - Leitura pressão diferencial do filtro despoeiramento silo de clinquer
val(19)=SmartTags("E1P01D1.STS_O_Sinal_EU")' E1P01D1_LEI_PRE_DIF - Leitura pressão diferencial do filtro do secador de escória
val(20)=SmartTags("CCM4.LEI_TEN_L1_NEU")'	CCM4_LEI_TEN_L1_NEU - Leitura tensão entre L1 e neutro do CCM 4
val(21)=SmartTags("CCM4.LEI_TEN_L2_NEU")'	CCM4_LEI_TEN_L2_NEU - Leitura tensão entre L2 e neutro do CCM 4
val(22)=SmartTags("CCM4.LEI_TEN_L3_NEU")' CCM4_LEI_TEN_L3_NEU - Leitura tensão entre L3 e neutro do CCM 4
val(23)=SmartTags("CCM4.LEI_TEN_L1_L2")' CCM4_LEI_TEN_L1_L2 - Leitura tensão entre L1 e L2 do CCM 4
val(24)=SmartTags("CCM4.LEI_TEN_L2_L3")'	CCM4_LEI_TEN_L2_L3 - Leitura tensão entre L2 e L3 do CCM 4
val(25)=SmartTags("CCM4.LEI_TEN_L1_L3")' CCM4_LEI_TEN_L1_L3 - Leitura tensão entre L1 e L3 do CCM 4
val(26)=SmartTags("CCM4.LEI_COR_L1")' CCM4_LEI_COR_L1 - Leitura corrente em L1 do CCM 4
val(27)=SmartTags("CCM4.LEI_COR_L2")' CCM4_LEI_COR_L2 - Leitura corrente em L2 do CCM 4
val(28)=SmartTags("CCM4.LEI_COR_L3")' CCM4_LEI_COR_L3 - Leitura corrente em L3 do CCM 4
val(29)=SmartTags("CCM4.LEI_POT_ATI_TOT")' CCM4_LEI_POT_ATI_TOT - Leitura potência ativa total do CCM 4
val(30)=SmartTags("CCM4.LEI_POT_REA_TOT")' CCM4_LEI_POT_REA_TOT - Leitura potência reativa total do CCM 4
val(31)=SmartTags("CCM4.LEI_DEM_POT_ATI")' CCM4_LEI_DEM_POT_ATI - Leitura demanda potência ativa do CCM 4
val(32)=SmartTags("CCM4.LEI_FAT_POT_TOT")' CCM4_LEI_FAT_POT_TOT - Leitura fator de potência total do CCM 4
val(33)=SmartTags("CCM4_LEI_ENE_CONS")' CCM4_LEI_ENE_CONS - Leitura energia consumida do CCM 4
val(34)=SmartTags("QDF.LEI_TEN_L1_NEU")' QDF_LEI_TEN_L1_NEU - Leitura tensão entre L1 e neutro do QDF
val(35)=SmartTags("QDF.LEI_TEN_L2_NEU")' QDF_LEI_TEN_L2_NEU - Leitura tensão entre L2 e neutro do QDF
val(36)=SmartTags("QDF.LEI_TEN_L3_NEU")' QDF_LEI_TEN_L3_NEU - Leitura tensão entre L3 e neutro do QDF
val(37)=SmartTags("QDF.LEI_TEN_L1_L2")' QDF_LEI_TEN_L1_L2 - Leitura tensão entre L1 e L2 do QDF
val(38)=SmartTags("QDF.LEI_TEN_L2_L3")' QDF_LEI_TEN_L2_L3 - Leitura tensão entre L2 e L3 do QDF
val(39)=SmartTags("QDF.LEI_TEN_L1_L3")' QDF_LEI_TEN_L1_L3 - Leitura tensão entre L1 e L3 do QDF
val(40)=SmartTags("QDF.LEI_COR_L1")' QDF_LEI_COR_L1 - Leitura corrente em L1 do QDF
val(41)=SmartTags("QDF.LEI_COR_L2")' QDF_LEI_COR_L2 - Leitura corrente em L2 do QDF
val(42)=SmartTags("QDF.LEI_COR_L3")'QDF_LEI_COR_L3 - Leitura corrente em L3 do QDF
val(43)=SmartTags("QDF.LEI_POT_ATI_TOT")' QDF_LEI_POT_ATI_TOT - Leitura potência ativa total do QDF
val(44)=SmartTags("QDF.LEI_POT_REA_TOT")' QDF_LEI_POT_REA_TOT - Leitura potência reativa total do QDF
val(45)=SmartTags("QDF.LEI_DEM_POT_ATI")' QDF_LEI_DEM_POT_ATI - Leitura demanda potência ativa do QDF
val(46)=SmartTags("QDF.LEI_FAT_POT_TOT")' QDF_LEI_FAT_POT_TOT - Leitura fator de potência total do QDF
val(47)=SmartTags("QDF_LEI_ENE_CONS")' QDF_LEI_ENE_CONS - Leitura energia consumida do QDF
val(48)=SmartTags("E1P04.Sts.currentPerc")'	E1P04_LEI_COR_POR - Leitura corrente em porcentagem Ventilador do Filtro Processo do Secador
val(49)=SmartTags("E1P04.Sts.current")' E1P04_LEI_COR_AMP - Leitura corrente em amperes Ventilador do Filtro Processo do Secador
val(50)=SmartTags("Z3S01M1.Cmd.velRef")' E1P04_SET_VEL - Set_point velocidade Ventilador do Filtro Processo do Secador
val(51)=SmartTags("E1P04.Sts.hz")' E1P04_IND_VEL_FRE - Indicação velocidade em frequencia Ventilador do Filtro Processo do Secador
val(52)=SmartTags("E1P04.Sts.rpm")' E1P04_IND_VEL_RPM - Indicação velocidade em RPM Ventilador do Filtro Processo do Secador
val(53)=SmartTags("E1T01M1M4.Sts.currentPerc")' E1T01_LEI_COR_POR - Leitura corrente em porcentagem Secador de Escória
val(54)=SmartTags("E1T01M1M4.Sts.current")' E1T01_LEI_COR_AMP - Leitura corrente em amperes Secador de Escória
val(55)=SmartTags("E1T01M1M4.Cmd.velRef")' E1T01_SET_VEL - Set_point velocidade Secador de Escória
val(56)=SmartTags("E1T01M1M4.Sts.hz")' E1T01_IND_VEL_FRE - Indicação velocidade em frequencia Secador de Escória
val(57)=SmartTags("E1T01M1M4.Sts.rpm")' E1T01_IND_VEL_RPM - Indicação velocidade em RPM Secador de Escória
val(58)=SmartTags("E2P02.Sts.currentPerc")' E2P02_LEI_COR_POR - Leitura corrente em porcentagem Ventilador Ar Combustão do Queimador Cavacos
val(59)=SmartTags("E2P02.Sts.current")' E2P02_LEI_COR_AMP - Leitura corrente em amperes Ventilador Ar Combustão do Queimador Cavacos
val(60)=SmartTags("E2P02.Cmd.velRef")' E2P02_SET_VEL - Set_point velocidade Ventilador Ar Combustão do Queimador Cavacos
val(61)=SmartTags("E2P02.Sts.hz")' E2P02_IND_VEL_FRE - Indicação velocidade em frequencia Ventilador Ar Combustão do Queimador Cavacos
val(62)=SmartTags("E2P02.Sts.rpm")' E2P02_IND_VEL_RPM - Indicação velocidade em RPM Ventilador Ar Combustão do Queimador Cavacos
val(63)=SmartTags("E2J02.Sts.currentPerc")' E2J02_LEI_COR_POR - Leitura corrente em porcentagem Rosca Dosadora do Queimador Cavacos
val(64)=SmartTags("E2J02.Sts.current")' E2J02_LEI_COR_AMP - Leitura corrente em amperes Rosca Dosadora do Queimador Cavacos
val(65)=SmartTags("E2J02.Cmd.velRef")' E2J02_SET_VEL - Set_point velocidade Rosca Dosadora do Queimador Cavacos
val(66)=SmartTags("E2P02.Sts.hz")' E2J02_IND_VEL_FRE - Indicação velocidade em frequencia Rosca Dosadora do Queimador Cavacos
val(67)=SmartTags("E2P02.Sts.rpm")' E2J02_IND_VEL_RPM - Indicação velocidade em RPM Rosca Dosadora do Queimador Cavacos
val(68)=SmartTags("M1J22.Sts.currentPerc")' M1J22_LEI_COR_POR - Leitura corrente em porcentagem Correia Alimentação do Silo de Cavacos
val(69)=SmartTags("M1J22.Sts.current")' M1J22_LEI_COR_AMP - Leitura corrente em amperes Correia Alimentação do Silo de Cavacos
val(70)=SmartTags("M1J22.Cmd.velRef")' M1J22_SET_VEL - Set_point velocidade Correia Alimentação do Silo de Cavacos
val(71)=SmartTags("M1J22.Sts.hz")' M1J22_IND_VEL_FRE - Indicação velocidade em frequencia Correia Alimentação do Silo de Cavacos
val(72)=SmartTags("M1J22.Sts.rpm")' M1J22_IND_VEL_RPM - Indicação velocidade em amperes Correia Alimentação do Silo de Cavacos
val(73)=SmartTags("M1J09.Sts.currentPerc")' M1J09_LEI_COR_POR - Leitura corrente em porcentagem Balança Dosadora do Secador de Escória
val(74)=SmartTags("M1J09.Sts.current")' M1J09_LEI_COR_AMP - Leitura corrente em amperes Balança Dosadora do Secador de Escória
val(75)=SmartTags("M1J09_SP_MILL")'  M1J09_SET_VEL_MILL - Set_point velocidade Balança Dosadora do Secador de Escória (Miltronics)
val(76)=SmartTags("M1J09.Sts.hz")' M1J09_IND_VEL_FRE - Indicação velocidade em frequencia Balança Dosadora do Secador de Escória
val(77)=SmartTags("M1J09.Sts.rpm")'  M1J09_IND_VEL_RPM - Indicação velocidade em RPM Balança Dosadora do Secador de Escória
val(78)=SmartTags("M1J09.Cmd.velRef")'  M1J09_SET_VEL_POR - Set_point velocidade Balança Dosadora do Secador de Escória (Porcentagem)
val(79)=SmartTags("SEL_MAT_PRIMA_SECADOR")' Materia prima produzida pelo secador (Sempre escória - 51)
val(80)=SmartTags("L1P05_GEP")' Seleção de silo escória (5 - Silo Calcário, 6 - Silo Gesso, 7 - Silo Clínquer, 8 - Silo de Escória)
val(81)=SmartTags("Z3M01M1_LEI_TEN_L2_NEU")'Totalizador do queimador de cavaco (Ton)
val(82)=SmartTags("M1J09.TOT_SEC")' Totalizador do secador de escória (Ton)
val(83)=SmartTags("L1P05_GEP")' diferencial do filtro de despoeiramento do silo de escória L1P05
val(84)=SmartTags("E1P01P1.STS_O_Sinal_EU")' Diferencial filtro secador E1P01P1   
val(85)=SmartTags("M1J09_VAZ_UMI")'  Vazão escória úmida instantânea
val(86)=SmartTags("M1J09_VAZ_SEC")' Vazão escória seca instantânea	


'Formarta e arredunda os valores 
For i = 10 To 86
	
        If i < 87 Then
     val(i) =   FormatNumber(val(i),2,True,False,False)
       
           End If 
Next 
	


Mon = Right("00" & Month (Now()),2)
Y = Year(Date())
d = Right("00" & Day (Now()),2)
H = Right("00"& Hour(Time()),2)
Min = Right("00"& Minute(Time()),2)
S = Second(Time())
 
DataTime= d & Mon & Y

ULT0 = DataTime & ".S01"
'Create Folder year_month
'Set fso = CreateObject("Scripting.FileSystemObject")
'folder_y_m = "Z:\RELATORIOS\" & Y & "_" & Mon
'If Not fso.FolderExists(folder_y_m) Then
' fso.CreateFolder (folder_y_m)
'End If
'Create Folder day
'Set fso1 = CreateObject("Scripting.FileSystemObject")
'folder_day = folder_y_m & "\" & d
'If Not fso1.FolderExists(folder_day) Then
' fso1.CreateFolder (folder_day)
'End If
'Create File Excel
Set fso2 = CreateObject("Scripting.FileSystemObject")
filepath_C = "C:\\Relatorios" & folder_day & "\" & ULT0


'Salva no pasta c:\\Relatorios
If Not fso2.FileExists(filepath_C) Then
 fso2.CreateTextFile(filepath_C)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath_C,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath_C,8,1)
fso3.WriteLine Y & Mon & d & H & Min & ";" & val(10) & ";" & val(11) & ";" & val(12) & ";" & val(13) & ";" & val(14) & ";" & val(15) & ";" & val(16) & ";" & val(17) & ";" & val(18) & ";" & val(19) & ";" & val(20) & ";" & val(21) & ";" & val(22) & ";" & val(23) & ";" & val(24) & ";" & val(25) & ";" & val(26) & ";" & val(27) & ";" & val(28) & ";" & val(29) & ";" & val(30) & ";" & val(31) & ";" & val(32) & ";" & val(33) & ";" & val(34) & ";" & val(35) & ";" & val(36) & ";" & val(37) & ";" & val(38) & ";" & val(39) & ";" & val(40) & ";" & val(41) & ";" & val(42) & ";" & val(43) & ";" & val(44) & ";" & val(45) & ";" & val(46) & ";" & val(47) & ";" & val(48) & ";" & val(49) & ";" & val(50) & ";" & val(51) & ";" & val(52) & ";" & val(53) & ";" & val(54) & ";" & val(55) & ";" & val(56) & ";" & val(57) & ";" & val(58) & ";" & val(59) & ";" & val(60) & ";" & val(61) & ";" & val(62) & ";" & val(63) & ";" & val(64) & ";" & val(65) & ";" & val(66) & ";" & val(67) & ";" & val(68) & ";" & val(69) & ";" & val(70) & ";" & val(71) & ";" & val(72) & ";" & val(73) & ";" & val(74) & ";" & val(75) & ";" &val(76) & ";" & val(77) & ";" & val(78) & ";" & val(79) & ";" & val(80) & ";" & val(81) & ";" & val(82) & ";" & val(83) & ";" & val(84) & ";" & val(85) & ";" & val(86) 
fso3.Close


'Salva no pasta z:\\
filepath = "Z:\\" & folder_day & "\" & ULT0
If Not fso2.FileExists(filepath) Then
 fso2.CreateTextFile(filepath)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath,8,1)
fso3.WriteLine Y & Mon & d & H & Min & ";" & val(10) & ";" & val(11) & ";" & val(12) & ";" & val(13) & ";" & val(14) & ";" & val(15) & ";" & val(16) & ";" & val(17) & ";" & val(18) & ";" & val(19) & ";" & val(20) & ";" & val(21) & ";" & val(22) & ";" & val(23) & ";" & val(24) & ";" & val(25) & ";" & val(26) & ";" & val(27) & ";" & val(28) & ";" & val(29) & ";" & val(30) & ";" & val(31) & ";" & val(32) & ";" & val(33) & ";" & val(34) & ";" & val(35) & ";" & val(36) & ";" & val(37) & ";" & val(38) & ";" & val(39) & ";" & val(40) & ";" & val(41) & ";" & val(42) & ";" & val(43) & ";" & val(44) & ";" & val(45) & ";" & val(46) & ";" & val(47) & ";" & val(48) & ";" & val(49) & ";" & val(50) & ";" & val(51) & ";" & val(52) & ";" & val(53) & ";" & val(54) & ";" & val(55) & ";" & val(56) & ";" & val(57) & ";" & val(58) & ";" & val(59) & ";" & val(60) & ";" & val(61) & ";" & val(62) & ";" & val(63) & ";" & val(64) & ";" & val(65) & ";" & val(66) & ";" & val(67) & ";" & val(68) & ";" & val(69) & ";" & val(70) & ";" & val(71) & ";" & val(72) & ";" & val(73) & ";" & val(74) & ";" & val(75) & ";" &val(76) & ";" & val(77) & ";" & val(78) & ";" & val(79) & ";" & val(80) & ";" & val(81) & ";" & val(82) & ";" & val(83) & ";" & val(84) & ";" & val(85) & ";" & val(86) 
fso3.Close



End Function